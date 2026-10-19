'use strict';

const { query } = require('../../config/db');
const v = require('../../middleware/validate');

/* ------------------------------------------------------------------ dates */

const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const PRESETS = {
  today: 0,
  '7d': 6,
  '30d': 29,
  '90d': 89,
  '12m': 364,
};

/**
 * Work out the window being reported on, plus the immediately preceding window
 * of the same length so every figure can be shown against "before".
 */
function resolveRange(q) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let from;
  let to = today;

  const customFrom = v.date(q.from);
  const customTo = v.date(q.to);

  if (customFrom) {
    from = new Date(`${customFrom}T00:00:00`);
    if (customTo) to = new Date(`${customTo}T00:00:00`);
  } else {
    const preset = String(q.preset || '30d').toLowerCase();
    const back = PRESETS[preset] ?? PRESETS['30d'];
    from = new Date(today);
    from.setDate(from.getDate() - back);
  }

  if (from > to) [from, to] = [to, from];

  const days = Math.round((to - from) / 86400000) + 1;

  const previousTo = new Date(from);
  previousTo.setDate(previousTo.getDate() - 1);
  const previousFrom = new Date(previousTo);
  previousFrom.setDate(previousFrom.getDate() - (days - 1));

  return {
    from: iso(from),
    to: iso(to),
    previousFrom: iso(previousFrom),
    previousTo: iso(previousTo),
    days,
  };
}

/** Inclusive-of-end-day bounds for a DATETIME column. */
const bounds = (from, to) => [`${from} 00:00:00`, `${to} 23:59:59`];

async function countIn(table, column, from, to, extra = '') {
  const [row] = await query(
    `SELECT COUNT(*) AS total FROM ${table} WHERE ${column} BETWEEN ? AND ? ${extra}`,
    bounds(from, to),
  );
  return Number(row.total);
}

/** Percentage change, with the awkward divide-by-zero cases spelled out. */
function delta(current, previous) {
  if (previous === 0) {
    return { direction: current > 0 ? 'up' : 'flat', percent: null, previous, current };
  }
  const percent = Math.round(((current - previous) / previous) * 100);
  return {
    direction: percent > 0 ? 'up' : percent < 0 ? 'down' : 'flat',
    percent: Math.abs(percent),
    previous,
    current,
  };
}

/** Day-by-day series for both metrics, with empty days filled in. */
async function buildSeries(from, to, days) {
  const [clicks, enquiries] = await Promise.all([
    query(
      `SELECT DATE(clicked_at) AS day, COUNT(*) AS total
         FROM whatsapp_clicks WHERE clicked_at BETWEEN ? AND ? GROUP BY DATE(clicked_at)`,
      bounds(from, to),
    ),
    query(
      `SELECT DATE(created_at) AS day, COUNT(*) AS total
         FROM enquiries WHERE created_at BETWEEN ? AND ? GROUP BY DATE(created_at)`,
      bounds(from, to),
    ),
  ]);

  const key = (d) => (d instanceof Date ? iso(d) : String(d).slice(0, 10));
  const clickMap = new Map(clicks.map((r) => [key(r.day), Number(r.total)]));
  const enquiryMap = new Map(enquiries.map((r) => [key(r.day), Number(r.total)]));

  const start = new Date(`${from}T00:00:00`);
  const series = [];

  for (let i = 0; i < days; i += 1) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const day = iso(d);
    series.push({
      date: day,
      label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      enquiries: enquiryMap.get(day) || 0,
      clicks: clickMap.get(day) || 0,
    });
  }

  return series;
}

/**
 * GET /api/admin/dashboard?preset=30d | ?from=&to=
 * Everything the dashboard needs, in one request.
 */
async function overview(req, res) {
  const range = resolveRange(req.query);
  const { from, to, previousFrom, previousTo, days } = range;

  const [
    enquiriesNow,
    enquiriesBefore,
    clicksNow,
    clicksBefore,
    series,
    [totals],
    statusRows,
    serviceRows,
    topVehicles,
    latest,
  ] = await Promise.all([
    countIn('enquiries', 'created_at', from, to),
    countIn('enquiries', 'created_at', previousFrom, previousTo),
    countIn('whatsapp_clicks', 'clicked_at', from, to),
    countIn('whatsapp_clicks', 'clicked_at', previousFrom, previousTo),
    buildSeries(from, to, days),
    query(`
      SELECT
        (SELECT COUNT(*) FROM vehicles)                        AS vehicles_total,
        (SELECT COUNT(*) FROM vehicles WHERE is_visible = 1)   AS vehicles_visible,
        (SELECT COUNT(*) FROM testimonials WHERE is_approved = 0) AS reviews_pending,
        (SELECT COUNT(*) FROM testimonials)                    AS reviews_total,
        (SELECT COUNT(*) FROM promotions
          WHERE is_active = 1
            AND (starts_at IS NULL OR starts_at <= CURDATE())
            AND (ends_at   IS NULL OR ends_at   >= CURDATE()))  AS offers_active,
        (SELECT COUNT(*) FROM promotions)                      AS offers_total,
        (SELECT COUNT(*) FROM gallery_photos)                  AS gallery_photos,
        (SELECT COUNT(*) FROM services WHERE is_visible = 1)   AS services_live,
        (SELECT COUNT(*) FROM enquiries WHERE status = 'new')  AS enquiries_unanswered
    `),
    query(
      `SELECT status, COUNT(*) AS total FROM enquiries
        WHERE created_at BETWEEN ? AND ? GROUP BY status`,
      bounds(from, to),
    ),
    query(
      `SELECT COALESCE(NULLIF(service_type, ''), 'Not specified') AS label, COUNT(*) AS total
         FROM enquiries
        WHERE created_at BETWEEN ? AND ?
        GROUP BY label
        ORDER BY total DESC`,
      bounds(from, to),
    ),
    query(
      `SELECT v.id, v.name, v.slug,
              (SELECT COUNT(*) FROM enquiries e
                WHERE e.vehicle_id = v.id AND e.created_at BETWEEN ? AND ?) AS enquiry_count,
              (SELECT COUNT(*) FROM whatsapp_clicks w
                WHERE w.vehicle_id = v.id AND w.clicked_at BETWEEN ? AND ?) AS click_count
         FROM vehicles v
        ORDER BY enquiry_count DESC, click_count DESC, v.sort_order ASC
        LIMIT 5`,
      [...bounds(from, to), ...bounds(from, to)],
    ),
    query(
      `SELECT id, full_name, phone, email, service_type, vehicle_name,
              pickup, dropoff, travel_datetime, status, created_at
         FROM enquiries
        WHERE created_at BETWEEN ? AND ?
        ORDER BY created_at DESC, id DESC
        LIMIT 8`,
      bounds(from, to),
    ),
  ]);

  const status = { new: 0, contacted: 0, confirmed: 0, closed: 0 };
  for (const row of statusRows) status[row.status] = Number(row.total);

  // The card sparklines reuse the day series, so there is one source of truth.
  const spark = (key) => series.map((d) => d[key]);

  res.json({
    range,

    stats: {
      enquiries: {
        value: enquiriesNow,
        delta: delta(enquiriesNow, enquiriesBefore),
        spark: spark('enquiries'),
      },
      whatsapp: {
        value: clicksNow,
        delta: delta(clicksNow, clicksBefore),
        spark: spark('clicks'),
      },
      vehicles: { value: Number(totals.vehicles_total), visible: Number(totals.vehicles_visible) },
      reviews: { value: Number(totals.reviews_pending), total: Number(totals.reviews_total) },
      offers: { value: Number(totals.offers_active), total: Number(totals.offers_total) },
      gallery: { value: Number(totals.gallery_photos), servicesLive: Number(totals.services_live) },
    },

    todo: {
      unanswered: Number(totals.enquiries_unanswered),
      reviewsPending: Number(totals.reviews_pending),
      clicks: clicksNow,
    },

    series,
    status,

    breakdown: serviceRows.map((r) => ({ label: r.label, total: Number(r.total) })),

    topVehicles: topVehicles.map((row) => ({
      ...row,
      enquiry_count: Number(row.enquiry_count),
      click_count: Number(row.click_count),
    })),

    latest,
  });
}

/* ------------------------------------------------------------------ export */

function csvCell(value) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * GET /api/admin/dashboard/export?preset=&from=&to=
 * Enquiries for the selected window as CSV, for the Export button.
 */
async function exportEnquiries(req, res) {
  const { from, to } = resolveRange(req.query);

  const rows = await query(
    `SELECT id, created_at, status, full_name, phone, email, service_type, vehicle_name,
            pickup, dropoff, travel_datetime, flight_number, passengers, suitcases,
            return_trip, message, source_page
       FROM enquiries
      WHERE created_at BETWEEN ? AND ?
      ORDER BY created_at DESC`,
    bounds(from, to),
  );

  const headers = [
    'ID', 'Received', 'Status', 'Name', 'Phone', 'Email', 'Service', 'Vehicle',
    'Pickup', 'Drop-off', 'Travel date', 'Flight', 'Passengers', 'Suitcases',
    'Return trip', 'Message', 'Sent from',
  ];

  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push(
      [
        r.id, r.created_at, r.status, r.full_name, r.phone, r.email, r.service_type,
        r.vehicle_name, r.pickup, r.dropoff, r.travel_datetime, r.flight_number,
        r.passengers, r.suitcases, r.return_trip ? 'Yes' : 'No', r.message, r.source_page,
      ]
        .map(csvCell)
        .join(','),
    );
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="enquiries-${from}-to-${to}.csv"`);
  // BOM so Excel opens the accented Swiss place names correctly.
  res.send(`﻿${lines.join('\n')}`);
}

/* --------------------------------------------- kept for backwards use ----- */

async function stats(req, res) {
  const [row] = await query(`
    SELECT
      (SELECT COUNT(*) FROM vehicles)                                          AS vehicles_total,
      (SELECT COUNT(*) FROM vehicles WHERE is_visible = 1)                     AS vehicles_active,
      (SELECT COUNT(*) FROM enquiries WHERE status = 'new')                    AS enquiries_new,
      (SELECT COUNT(*) FROM enquiries)                                         AS enquiries_total,
      (SELECT COUNT(*) FROM whatsapp_clicks
        WHERE clicked_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01'))                AS clicks_this_month,
      (SELECT COUNT(*) FROM testimonials WHERE is_approved = 0)                AS testimonials_pending,
      (SELECT COUNT(*) FROM promotions WHERE is_active = 1)                    AS promotions_active,
      (SELECT COUNT(*) FROM gallery_photos)                                    AS gallery_photos,
      (SELECT COUNT(*) FROM services WHERE is_visible = 1)                     AS services_active
  `);

  const numeric = {};
  for (const [key, value] of Object.entries(row)) numeric[key] = Number(value || 0);
  res.json({ stats: numeric });
}

module.exports = { overview, exportEnquiries, stats };
