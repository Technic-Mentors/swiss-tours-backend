'use strict';

const { query, execute } = require('../../config/db');
const v = require('../../middleware/validate');
const crud = require('../../utils/crud');
const cascade = require('../../utils/cascade');
const { readPaging, meta, limitClause, dateRange } = require('../../utils/paginate');

/* -------------------------------------------------------------- testimonials */

async function listTestimonials(req, res) {
  const status = v.str(req.query.status);
  const q = v.str(req.query.q);

  const where = ['1 = 1'];
  const params = [];

  if (status === 'pending') where.push('is_approved = 0');
  else if (status === 'approved') where.push('is_approved = 1');

  if (q) {
    where.push('(customer_name LIKE ? OR review_text LIKE ? OR service_label LIKE ?)');
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }

  const added = dateRange('created_at', req.query.date_from, req.query.date_to);
  where.push(...added.where);
  params.push(...added.params);

  const whereSql = where.join(' AND ');
  const paging = readPaging(req.query);
  const limit = limitClause(paging);

  const [testimonials, [{ total }]] = await Promise.all([
    query(
      `SELECT * FROM testimonials WHERE ${whereSql} ORDER BY sort_order ASC, id ASC ${limit.sql}`,
      [...params, ...limit.params],
    ),
    query(`SELECT COUNT(*) AS total FROM testimonials WHERE ${whereSql}`, params),
  ]);

  res.json({ testimonials, pagination: meta(paging, total) });
}

function readTestimonial(body) {
  const rating = v.int(body.rating);
  return {
    customer_name: v.str(body.customer_name).slice(0, 160),
    country: v.nullable(body.country),
    service_label: v.nullable(body.service_label),
    rating: rating && rating >= 1 && rating <= 5 ? rating : 5,
    review_text: v.str(body.review_text),
    photo: v.nullable(body.photo),
    source: v.str(body.source) === 'google' ? 'google' : 'direct',
    is_approved: v.bool(body.is_approved, 0),
    is_featured: v.bool(body.is_featured, 0),
  };
}

async function createTestimonial(req, res) {
  const body = req.body || {};
  v.requireFields(body, ['customer_name', 'review_text']);

  const f = readTestimonial(body);
  const sortOrder = await crud.nextSortOrder('testimonials');

  const result = await execute(
    `INSERT INTO testimonials
       (customer_name, country, service_label, rating, review_text, photo, source,
        is_approved, is_featured, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      f.customer_name, f.country, f.service_label, f.rating, f.review_text,
      f.photo, f.source, f.is_approved, f.is_featured, sortOrder,
    ],
  );

  res.status(201).json({ id: result.insertId, message: 'Testimonial created.' });
}

async function updateTestimonial(req, res) {
  const id = v.requireId(req.params.id);
  await crud.findOrFail('testimonials', id, 'Testimonial');

  const body = req.body || {};
  v.requireFields(body, ['customer_name', 'review_text']);

  const f = readTestimonial(body);

  await execute(
    `UPDATE testimonials SET
       customer_name = ?, country = ?, service_label = ?, rating = ?, review_text = ?,
       photo = ?, source = ?, is_approved = ?, is_featured = ?
     WHERE id = ?`,
    [
      f.customer_name, f.country, f.service_label, f.rating, f.review_text,
      f.photo, f.source, f.is_approved, f.is_featured, id,
    ],
  );

  res.json({ id, message: 'Testimonial saved.' });
}

async function removeTestimonial(req, res) {
  const id = v.requireId(req.params.id);
  await crud.findOrFail('testimonials', id, 'Testimonial');
  await cascade.deleteTestimonial(id);
  res.json({ message: 'Testimonial deleted.' });
}

async function approveTestimonial(req, res) {
  const id = v.requireId(req.params.id);
  const raw = req.body?.is_approved;
  const next = await crud.toggle('testimonials', 'is_approved', id, raw === undefined ? null : v.bool(raw));
  res.json({ id, is_approved: next });
}

async function featureTestimonial(req, res) {
  const id = v.requireId(req.params.id);
  const raw = req.body?.is_featured;
  const next = await crud.toggle('testimonials', 'is_featured', id, raw === undefined ? null : v.bool(raw));
  res.json({ id, is_featured: next });
}

async function reorderTestimonials(req, res) {
  const count = await crud.reorder('testimonials', req.body?.ids, req.body?.start);
  res.json({ message: `Reordered ${count} testimonials.` });
}

/* ---------------------------------------------------------------- promotions */

/** Derive live / scheduled / expired from the dates rather than storing it. */
function withStatus(promo) {
  const today = new Date().toISOString().slice(0, 10);
  const starts = promo.starts_at ? String(promo.starts_at).slice(0, 10) : null;
  const ends = promo.ends_at ? String(promo.ends_at).slice(0, 10) : null;

  let status = 'live';
  if (!promo.is_active) status = 'paused';
  else if (starts && starts > today) status = 'scheduled';
  else if (ends && ends < today) status = 'expired';

  return { ...promo, status };
}

async function listPromotions(req, res) {
  const q = v.str(req.query.q);
  const where = ['1 = 1'];
  const params = [];

  if (q) {
    where.push('(title LIKE ? OR code LIKE ?)');
    params.push(`%${q}%`, `%${q}%`);
  }

  // Filter on the offer window overlapping the requested range.
  const from = v.date(req.query.date_from);
  const to = v.date(req.query.date_to);
  if (from) {
    where.push('(ends_at IS NULL OR ends_at >= ?)');
    params.push(from);
  }
  if (to) {
    where.push('(starts_at IS NULL OR starts_at <= ?)');
    params.push(to);
  }

  const whereSql = where.join(' AND ');
  const paging = readPaging(req.query);
  const limit = limitClause(paging);

  const [promotions, [{ total }]] = await Promise.all([
    query(
      `SELECT * FROM promotions WHERE ${whereSql} ORDER BY sort_order ASC, id ASC ${limit.sql}`,
      [...params, ...limit.params],
    ),
    query(`SELECT COUNT(*) AS total FROM promotions WHERE ${whereSql}`, params),
  ]);

  res.json({ promotions: promotions.map(withStatus), pagination: meta(paging, total) });
}

function readPromotion(body) {
  const placement = v.str(body.placement);
  return {
    title: v.str(body.title).slice(0, 200),
    description: v.nullable(body.description),
    code: v.nullable(body.code),
    banner_image: v.nullable(body.banner_image),
    placement: ['homepage_banner', 'offers_page', 'both'].includes(placement) ? placement : 'both',
    starts_at: v.date(body.starts_at),
    ends_at: v.date(body.ends_at),
    link_type: v.str(body.link_type) || 'whatsapp',
    link_url: v.nullable(body.link_url),
    is_active: v.bool(body.is_active, 1),
  };
}

async function createPromotion(req, res) {
  const body = req.body || {};
  v.requireFields(body, ['title']);

  const f = readPromotion(body);
  const sortOrder = await crud.nextSortOrder('promotions');

  const result = await execute(
    `INSERT INTO promotions
       (title, description, code, banner_image, placement, starts_at, ends_at,
        link_type, link_url, is_active, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      f.title, f.description, f.code, f.banner_image, f.placement,
      f.starts_at, f.ends_at, f.link_type, f.link_url, f.is_active, sortOrder,
    ],
  );

  res.status(201).json({ id: result.insertId, message: 'Offer created.' });
}

async function updatePromotion(req, res) {
  const id = v.requireId(req.params.id);
  await crud.findOrFail('promotions', id, 'Offer');

  const body = req.body || {};
  v.requireFields(body, ['title']);

  const f = readPromotion(body);

  await execute(
    `UPDATE promotions SET
       title = ?, description = ?, code = ?, banner_image = ?, placement = ?,
       starts_at = ?, ends_at = ?, link_type = ?, link_url = ?, is_active = ?
     WHERE id = ?`,
    [
      f.title, f.description, f.code, f.banner_image, f.placement,
      f.starts_at, f.ends_at, f.link_type, f.link_url, f.is_active, id,
    ],
  );

  res.json({ id, message: 'Offer saved.' });
}

async function removePromotion(req, res) {
  const id = v.requireId(req.params.id);
  await crud.findOrFail('promotions', id, 'Offer');
  await cascade.deletePromotion(id);
  res.json({ message: 'Offer deleted.' });
}

/**
 * POST /api/admin/promotions/:id/duplicate
 * The copy starts paused so it cannot go live before it has been edited.
 */
async function duplicatePromotion(req, res) {
  const id = v.requireId(req.params.id);
  const p = await crud.findOrFail('promotions', id, 'Offer');
  const sortOrder = await crud.nextSortOrder('promotions');

  const result = await execute(
    `INSERT INTO promotions
       (title, description, code, banner_image, placement, starts_at, ends_at,
        link_type, link_url, is_active, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    [
      `${p.title} (copy)`, p.description, p.code, p.banner_image, p.placement,
      p.starts_at, p.ends_at, p.link_type, p.link_url, sortOrder,
    ],
  );

  res.status(201).json({ id: result.insertId, message: 'Offer duplicated (paused).' });
}

async function togglePromotion(req, res) {
  const id = v.requireId(req.params.id);
  const raw = req.body?.is_active;
  const next = await crud.toggle('promotions', 'is_active', id, raw === undefined ? null : v.bool(raw));
  res.json({ id, is_active: next });
}

async function reorderPromotions(req, res) {
  const count = await crud.reorder('promotions', req.body?.ids, req.body?.start);
  res.json({ message: `Reordered ${count} offers.` });
}

module.exports = {
  listTestimonials,
  createTestimonial,
  updateTestimonial,
  removeTestimonial,
  approveTestimonial,
  featureTestimonial,
  reorderTestimonials,

  listPromotions,
  createPromotion,
  updatePromotion,
  removePromotion,
  duplicatePromotion,
  togglePromotion,
  reorderPromotions,
};
