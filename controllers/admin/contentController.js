'use strict';

const { query, execute, transaction } = require('../../config/db');
const { ApiError } = require('../../middleware/errorHandler');
const v = require('../../middleware/validate');
const crud = require('../../utils/crud');

const EDITABLE_PAGES = new Set(['home', 'about', 'footer', 'privacy', 'terms', 'impressum']);

/* ----------------------------------------------------------- content blocks */

async function getPage(req, res) {
  const pageKey = v.str(req.params.pageKey || 'home').toLowerCase();
  if (!EDITABLE_PAGES.has(pageKey)) {
    throw ApiError.notFound(`Unknown page: ${pageKey}`, 'unknown_page');
  }

  const rows = await query(
    'SELECT block_key, block_value, block_type FROM content_blocks WHERE page_key = ? ORDER BY block_key',
    [pageKey],
  );

  const content = {};
  for (const row of rows) content[row.block_key] = row.block_value;

  res.json({ page: pageKey, blocks: rows, content });
}

/**
 * PUT /api/admin/content/:pageKey
 * Body: { blocks: { block_key: value, ... } }
 * Upserts so a brand new block can be added without a migration.
 */
async function updatePage(req, res) {
  const pageKey = v.str(req.params.pageKey || 'home').toLowerCase();
  if (!EDITABLE_PAGES.has(pageKey)) {
    throw ApiError.notFound(`Unknown page: ${pageKey}`, 'unknown_page');
  }

  const blocks = req.body?.blocks;
  if (!blocks || typeof blocks !== 'object' || Array.isArray(blocks)) {
    throw ApiError.badRequest('Send a "blocks" object of key/value pairs.', 'bad_blocks');
  }

  const entries = Object.entries(blocks);
  if (!entries.length) return res.json({ message: 'Nothing to save.' });

  await transaction(async (conn) => {
    for (const [key, value] of entries) {
      const blockKey = v.str(key).slice(0, 80);
      if (!blockKey) continue;
      await conn.execute(
        `INSERT INTO content_blocks (page_key, block_key, block_value)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE block_value = VALUES(block_value)`,
        [pageKey, blockKey, value === null || value === undefined ? null : String(value)],
      );
    }
  });

  res.json({ message: 'Content saved.', page: pageKey, saved: entries.length });
}

/* -------------------------------------------------------- homepage sections */

async function listSections(req, res) {
  const sections = await query(
    'SELECT id, section_key, label, description, sort_order, is_visible FROM homepage_sections ORDER BY sort_order ASC, id ASC',
  );
  res.json({ sections });
}

async function reorderSections(req, res) {
  const count = await crud.reorder('homepage_sections', req.body?.ids, req.body?.start);
  res.json({ message: `Reordered ${count} sections.` });
}

/** PATCH /api/admin/content/sections/:key/visibility */
async function toggleSection(req, res) {
  const key = v.str(req.params.key);

  const rows = await query('SELECT id, is_visible FROM homepage_sections WHERE section_key = ? LIMIT 1', [key]);
  if (!rows.length) throw ApiError.notFound('Section not found', 'section_not_found');

  const raw = req.body?.is_visible;
  const next = raw === undefined ? (rows[0].is_visible ? 0 : 1) : v.bool(raw);

  await execute('UPDATE homepage_sections SET is_visible = ? WHERE id = ?', [next, rows[0].id]);
  res.json({ section_key: key, is_visible: next });
}

/* ---------------------------------------------------------------------- faqs */

async function listFaqs(req, res) {
  const faqs = await query('SELECT * FROM faqs ORDER BY sort_order ASC, id ASC');
  res.json({ faqs });
}

async function createFaq(req, res) {
  const body = req.body || {};
  v.requireFields(body, ['question', 'answer']);

  const sortOrder = await crud.nextSortOrder('faqs');
  const result = await execute(
    'INSERT INTO faqs (question, answer, sort_order, is_visible) VALUES (?, ?, ?, ?)',
    [v.str(body.question).slice(0, 255), v.str(body.answer), sortOrder, v.bool(body.is_visible, 1)],
  );

  res.status(201).json({ id: result.insertId, message: 'FAQ created.' });
}

async function updateFaq(req, res) {
  const id = v.requireId(req.params.id);
  await crud.findOrFail('faqs', id, 'FAQ');

  const body = req.body || {};
  v.requireFields(body, ['question', 'answer']);

  await execute('UPDATE faqs SET question = ?, answer = ?, is_visible = ? WHERE id = ?', [
    v.str(body.question).slice(0, 255),
    v.str(body.answer),
    v.bool(body.is_visible, 1),
    id,
  ]);

  res.json({ id, message: 'FAQ saved.' });
}

async function removeFaq(req, res) {
  const id = v.requireId(req.params.id);
  await crud.findOrFail('faqs', id, 'FAQ');
  await execute('DELETE FROM faqs WHERE id = ?', [id]);
  res.json({ message: 'FAQ deleted.' });
}

async function reorderFaqs(req, res) {
  const count = await crud.reorder('faqs', req.body?.ids, req.body?.start);
  res.json({ message: `Reordered ${count} FAQs.` });
}

module.exports = {
  getPage,
  updatePage,
  listSections,
  reorderSections,
  toggleSection,
  listFaqs,
  createFaq,
  updateFaq,
  removeFaq,
  reorderFaqs,
};
