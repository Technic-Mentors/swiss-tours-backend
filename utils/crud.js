'use strict';

/**
 * Small helpers shared by the admin modules.
 *
 * Every table name passed in here is allow-listed, never taken from a request,
 * because table and column names cannot be bound as `?` parameters.
 */

const { query, execute, transaction } = require('../config/db');
const { ApiError } = require('../middleware/errorHandler');

const SORTABLE_TABLES = new Set([
  'vehicles',
  'vehicle_categories',
  'vehicle_photos',
  'category_photos',
  'service_photos',
  'services',
  'cities',
  'gallery_albums',
  'gallery_photos',
  'testimonials',
  'promotions',
  'faqs',
  'homepage_sections',
]);

const TOGGLE_TABLES = new Set([
  'vehicles',
  'vehicle_categories',
  'services',
  'cities',
  'gallery_albums',
  'gallery_photos',
  'testimonials',
  'promotions',
  'faqs',
  'homepage_sections',
]);

const TOGGLE_COLUMNS = new Set(['is_visible', 'is_featured', 'is_approved', 'is_active', 'show_on_homepage']);

function assertTable(table, set, what) {
  if (!set.has(table)) throw new Error(`${what}: table not allowed: ${table}`);
}

/**
 * Persist a new display order.
 *
 * `ids` is the list in the order the admin dragged them into. When the list is
 * paginated, `start` is the index of the first row on that page, so the page's
 * rows are renumbered from `start + 1` and the other pages keep their places.
 */
async function reorder(table, ids, start = 0) {
  assertTable(table, SORTABLE_TABLES, 'reorder');

  if (!Array.isArray(ids) || !ids.length) {
    throw ApiError.badRequest('Send an "ids" array in the new order.', 'bad_order');
  }

  const clean = ids.map((id) => Number.parseInt(id, 10)).filter((n) => Number.isFinite(n) && n > 0);
  if (clean.length !== ids.length) {
    throw ApiError.badRequest('The order list contains an invalid id.', 'bad_order');
  }

  const offset = Number.isFinite(Number(start)) && Number(start) > 0 ? Math.floor(Number(start)) : 0;

  await transaction(async (conn) => {
    for (let i = 0; i < clean.length; i += 1) {
      await conn.execute(`UPDATE \`${table}\` SET sort_order = ? WHERE id = ?`, [offset + i + 1, clean[i]]);
    }
  });

  return clean.length;
}

/** Flip or set a boolean column, returning the new value. */
async function toggle(table, column, id, value = null) {
  assertTable(table, TOGGLE_TABLES, 'toggle');
  if (!TOGGLE_COLUMNS.has(column)) throw new Error(`toggle: column not allowed: ${column}`);

  const rows = await query(`SELECT \`${column}\` AS current FROM \`${table}\` WHERE id = ? LIMIT 1`, [id]);
  if (!rows.length) throw ApiError.notFound('Record not found');

  const next = value === null ? (rows[0].current ? 0 : 1) : (value ? 1 : 0);
  await execute(`UPDATE \`${table}\` SET \`${column}\` = ? WHERE id = ?`, [next, id]);
  return next;
}

/** Next sort_order for a table, so new rows land at the bottom. */
async function nextSortOrder(table, whereSql = '', params = []) {
  assertTable(table, SORTABLE_TABLES, 'nextSortOrder');
  const rows = await query(
    `SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM \`${table}\` ${whereSql}`,
    params,
  );
  return rows[0].next;
}

/** Fetch one row by id or throw a clean 404. */
async function findOrFail(table, id, label = 'Record') {
  assertTable(table, new Set([...SORTABLE_TABLES, 'enquiries', 'admin_users']), 'findOrFail');
  const rows = await query(`SELECT * FROM \`${table}\` WHERE id = ? LIMIT 1`, [id]);
  if (!rows.length) throw ApiError.notFound(`${label} not found`);
  return rows[0];
}

module.exports = { reorder, toggle, nextSortOrder, findOrFail };
