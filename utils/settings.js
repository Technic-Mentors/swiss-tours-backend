'use strict';

const { query, transaction } = require('../config/db');

/**
 * Settings are read on almost every public request (WhatsApp number, phone,
 * announcement bar), so they are cached in memory and invalidated on write.
 */
let cache = null;
let cachedAt = 0;
const TTL_MS = 60 * 1000;

/** Keys that must never be sent to the public site. */
const PRIVATE_KEYS = new Set([]);

async function loadAll(force = false) {
  const fresh = cache && Date.now() - cachedAt < TTL_MS;
  if (fresh && !force) return cache;

  const rows = await query('SELECT setting_key, setting_value, group_name FROM settings');
  cache = {};
  for (const row of rows) {
    cache[row.setting_key] = row.setting_value;
  }
  cachedAt = Date.now();
  return cache;
}

function invalidate() {
  cache = null;
  cachedAt = 0;
}

async function get(key, fallback = '') {
  const all = await loadAll();
  const value = all[key];
  return value === undefined || value === null ? fallback : value;
}

/** The subset safe to expose on the public site. */
async function publicBundle() {
  const all = await loadAll();
  const out = {};
  for (const [key, value] of Object.entries(all)) {
    if (!PRIVATE_KEYS.has(key)) out[key] = value;
  }
  return out;
}

/** Upsert a map of key -> value and clear the cache. */
async function setMany(values) {
  const entries = Object.entries(values).filter(([key]) => typeof key === 'string' && key.length);
  if (!entries.length) return;

  await transaction(async (conn) => {
    for (const [key, value] of entries) {
      await conn.execute(
        `INSERT INTO settings (setting_key, setting_value)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
        [key, value === null || value === undefined ? null : String(value)],
      );
    }
  });

  invalidate();
}

/** Digits-only WhatsApp number, ready for a wa.me link. */
async function whatsappNumber() {
  const raw = await get('whatsapp_number', '41000000000');
  return String(raw).replace(/\D/g, '');
}

module.exports = { loadAll, invalidate, get, publicBundle, setMany, whatsappNumber };
