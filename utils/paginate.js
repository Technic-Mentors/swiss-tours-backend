'use strict';

const v = require('../middleware/validate');

const DEFAULT_PER_PAGE = 20;
const MAX_PER_PAGE = 100;

/**
 * Read page / per_page off a request.
 *
 * `per_page=all` turns pagination off, which the sortable admin lists use when
 * the whole list fits on one page and drag-to-reorder should span everything.
 */
function readPaging(query, { defaultPerPage = DEFAULT_PER_PAGE } = {}) {
  const page = Math.max(v.int(query.page) || 1, 1);

  if (String(query.per_page).toLowerCase() === 'all') {
    return { page: 1, perPage: null, offset: 0, all: true };
  }

  const perPage = Math.min(Math.max(v.int(query.per_page) || defaultPerPage, 1), MAX_PER_PAGE);
  return { page, perPage, offset: (page - 1) * perPage, all: false };
}

/** Build the pagination block returned alongside every paginated list. */
function meta({ page, perPage, all }, total) {
  const count = Number(total || 0);
  return {
    page: all ? 1 : page,
    perPage: all ? count : perPage,
    total: count,
    pages: all ? 1 : Math.max(Math.ceil(count / perPage), 1),
    // Where this page starts in the overall list - the reorder endpoints need
    // it so dragging on page 2 does not renumber from 1.
    start: all ? 0 : (page - 1) * perPage,
  };
}

/** `LIMIT ? OFFSET ?` clause plus its params, or nothing when unpaginated. */
function limitClause({ perPage, offset, all }) {
  if (all) return { sql: '', params: [] };
  return { sql: 'LIMIT ? OFFSET ?', params: [perPage, offset] };
}

/**
 * Inclusive date-range filter on a column.
 * `to` is compared with < next-day so a same-day range still matches rows
 * recorded later that day.
 */
function dateRange(column, from, to) {
  const where = [];
  const params = [];

  const start = v.date(from);
  const end = v.date(to);

  if (start) {
    where.push(`${column} >= ?`);
    params.push(`${start} 00:00:00`);
  }
  if (end) {
    where.push(`${column} < DATE_ADD(?, INTERVAL 1 DAY)`);
    params.push(end);
  }

  return { where, params };
}

module.exports = { readPaging, meta, limitClause, dateRange, DEFAULT_PER_PAGE };
