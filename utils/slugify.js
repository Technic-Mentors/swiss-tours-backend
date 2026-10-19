'use strict';

const { query } = require('../config/db');

const TRANSLIT = {
  ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss',
  à: 'a', á: 'a', â: 'a', ã: 'a', å: 'a',
  è: 'e', é: 'e', ê: 'e', ë: 'e',
  ì: 'i', í: 'i', î: 'i', ï: 'i',
  ò: 'o', ó: 'o', ô: 'o', õ: 'o',
  ù: 'u', ú: 'u', û: 'u',
  ç: 'c', ñ: 'n', ý: 'y',
};

/**
 * Turn a name into a URL slug. German umlauts are transliterated rather than
 * stripped so "Zurich" and "Zuerich" both stay readable and keyword-relevant.
 */
function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .replace(/[äöüßàáâãåèéêëìíîïòóôõùúûçñý]/g, (ch) => TRANSLIT[ch] || ch)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 160);
}

const SLUG_TABLES = new Set([
  'vehicles',
  'vehicle_categories',
  'services',
  'cities',
  'gallery_albums',
]);

/**
 * Make a slug unique within its table by appending -2, -3 ... when taken.
 * `ignoreId` lets an update keep its own slug.
 */
async function ensureUniqueSlug(table, desired, ignoreId = null) {
  if (!SLUG_TABLES.has(table)) {
    throw new Error(`ensureUniqueSlug: table not allowed: ${table}`);
  }

  const base = slugify(desired) || 'item';
  let candidate = base;
  let n = 1;

  // Table name is allow-listed above, so it is safe to interpolate here.
  const sql = ignoreId
    ? `SELECT id FROM \`${table}\` WHERE slug = ? AND id <> ? LIMIT 1`
    : `SELECT id FROM \`${table}\` WHERE slug = ? LIMIT 1`;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const params = ignoreId ? [candidate, ignoreId] : [candidate];
    const rows = await query(sql, params);
    if (!rows.length) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
  }
}

/**
 * Pick the slug to store when UPDATING a record.
 *
 * A published slug is a live URL: it is in the sitemap, in Google's index and
 * in any link anyone has shared. Renaming the record must not silently move
 * the page, so the existing slug is kept unless the admin explicitly supplies
 * a new one. New records still derive their slug from the name.
 */
async function slugForUpdate(table, { existingSlug, requestedSlug, name, id }) {
  const requested = String(requestedSlug || '').trim();
  if (requested) return ensureUniqueSlug(table, requested, id);

  if (existingSlug) return existingSlug;

  // Only reachable if a row somehow has no slug.
  return ensureUniqueSlug(table, name, id);
}

module.exports = { slugify, ensureUniqueSlug, slugForUpdate };
