'use strict';

const { ApiError } = require('./errorHandler');

/** Trim a value to a string, or return '' for null/undefined. */
function str(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

/** Parse to a positive integer, or null when absent/invalid. */
function int(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}

/** Parse to a number, or null. */
function dec(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Coerce checkbox-ish values ('1', 'true', true, 1) to 0/1 for TINYINT columns. */
function bool(value, fallback = 0) {
  if (value === undefined || value === null || value === '') return fallback;
  if (value === true || value === 1) return 1;
  const v = String(value).toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on' ? 1 : 0;
}

/** null for empty strings, so optional columns stay NULL rather than ''. */
function nullable(value) {
  const s = str(value);
  return s === '' ? null : s;
}

/** Normalise a datetime-local value ("2026-02-01T14:30") into MySQL DATETIME. */
function datetime(value) {
  const s = str(value);
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

/** Normalise a date value into MySQL DATE, or null. */
function date(value) {
  const s = str(value);
  if (!s) return null;
  const match = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? match[0] : null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function isEmail(value) {
  return EMAIL_RE.test(str(value));
}

/**
 * Throw a 400 listing every missing field at once, so the client can show
 * them all rather than one per round trip.
 */
function requireFields(body, fields) {
  const missing = fields.filter((f) => str(body[f]) === '');
  if (missing.length) {
    throw ApiError.badRequest(
      `Missing required field${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}`,
      'missing_fields',
    );
  }
}

/** Validate an id coming from a route param. */
function requireId(value, label = 'id') {
  const n = int(value);
  if (!n || n < 1) throw ApiError.badRequest(`Invalid ${label}`, 'bad_id');
  return n;
}

/** Guard an ORDER BY column against injection by allow-listing it. */
function sortColumn(value, allowed, fallback) {
  const s = str(value);
  return allowed.includes(s) ? s : fallback;
}

function sortDirection(value) {
  return str(value).toLowerCase() === 'asc' ? 'ASC' : 'DESC';
}

module.exports = {
  str,
  int,
  dec,
  bool,
  nullable,
  datetime,
  date,
  isEmail,
  requireFields,
  requireId,
  sortColumn,
  sortDirection,
};
