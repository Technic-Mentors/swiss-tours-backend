'use strict';

const { query } = require('../../config/db');
const settings = require('../../utils/settings');
const { ApiError } = require('../../middleware/errorHandler');

const PUBLIC_PAGES = new Set(['home', 'about', 'footer', 'privacy', 'terms', 'impressum']);

/** Turn content_blocks rows into a flat { block_key: value } object. */
function toMap(rows) {
  const out = {};
  for (const row of rows) out[row.block_key] = row.block_value;
  return out;
}

/**
 * Blocks of type 'json' hold repeating items as a pipe-delimited string:
 *   "Title|Body||Title|Body"  ->  [['Title','Body'], ['Title','Body']]
 * A plain list uses single pipes only: "A|B|C" -> [['A'],['B'],['C']]
 */
function parseItems(value) {
  if (!value) return [];
  const raw = String(value);
  if (raw.includes('||')) {
    return raw.split('||').map((group) => group.split('|').map((s) => s.trim()));
  }
  return raw.split('|').map((s) => [s.trim()]);
}

async function getSettings(req, res) {
  const bundle = await settings.publicBundle();
  res.json({ settings: bundle });
}

/** Everything the homepage needs: section order, copy and the derived lists. */
async function getHome(req, res) {
  const [sections, blocks] = await Promise.all([
    query(
      'SELECT section_key, label, sort_order FROM homepage_sections WHERE is_visible = 1 ORDER BY sort_order ASC, id ASC',
    ),
    query('SELECT block_key, block_value, block_type FROM content_blocks WHERE page_key = ?', ['home']),
  ]);

  const content = toMap(blocks);

  res.json({
    sections: sections.map((s) => s.section_key),
    sectionMeta: sections,
    content,
    lists: {
      trust_items: parseItems(content.trust_items),
      why_items: parseItems(content.why_items),
      how_steps: parseItems(content.how_steps),
    },
  });
}

async function getPage(req, res) {
  const pageKey = String(req.params.pageKey || '').toLowerCase();
  if (!PUBLIC_PAGES.has(pageKey)) {
    throw ApiError.notFound(`Unknown page: ${pageKey}`, 'unknown_page');
  }

  const blocks = await query(
    'SELECT block_key, block_value, block_type FROM content_blocks WHERE page_key = ?',
    [pageKey],
  );

  const content = toMap(blocks);

  res.json({
    page: pageKey,
    content,
    lists: {
      stat_items: parseItems(content.stat_items),
    },
  });
}

async function getFaqs(req, res) {
  const faqs = await query(
    'SELECT id, question, answer FROM faqs WHERE is_visible = 1 ORDER BY sort_order ASC, id ASC',
  );
  res.json({ faqs });
}

module.exports = { getSettings, getHome, getPage, getFaqs, parseItems };
