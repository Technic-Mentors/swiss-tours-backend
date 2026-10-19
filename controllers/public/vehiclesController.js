'use strict';

const { query } = require('../../config/db');
const { ApiError } = require('../../middleware/errorHandler');
const { int, str } = require('../../middleware/validate');
const { buildMessage } = require('../../utils/whatsapp');

/**
 * One shared SELECT so a vehicle has the same shape everywhere it appears:
 * list, detail, category page, city page and "similar vehicles".
 */
const VEHICLE_FIELDS = `
  v.id, v.category_id, v.name, v.slug, v.tagline, v.description,
  v.passengers, v.suitcases, v.hand_bags,
  v.price_from, v.price_unit, v.price_note, v.ideal_for,
  v.whatsapp_template, v.is_featured, v.sort_order,
  c.name AS category_name, c.slug AS category_slug,
  (SELECT p.file_path FROM vehicle_photos p
    WHERE p.vehicle_id = v.id
    ORDER BY p.is_cover DESC, p.sort_order ASC, p.id ASC
    LIMIT 1) AS cover_image
`;

function shape(row) {
  return {
    ...row,
    price_from: row.price_from === null ? null : Number(row.price_from),
    ideal_for: row.ideal_for ? String(row.ideal_for).split('\n').map((s) => s.trim()).filter(Boolean) : [],
  };
}

/** GET /api/vehicles?category=&city=&featured=&limit= */
async function list(req, res) {
  const category = str(req.query.category);
  const city = str(req.query.city);
  const featured = str(req.query.featured);
  const limit = Math.min(int(req.query.limit) || 100, 100);

  const where = ['v.is_visible = 1'];
  const params = [];

  if (category) {
    where.push('c.slug = ?');
    params.push(category);
  }
  if (featured === '1' || featured === 'true') {
    where.push('v.is_featured = 1');
  }
  if (city) {
    where.push(`EXISTS (
      SELECT 1 FROM vehicle_cities vc
      JOIN cities ct ON ct.id = vc.city_id
      WHERE vc.vehicle_id = v.id AND ct.slug = ?
    )`);
    params.push(city);
  }

  const rows = await query(
    `SELECT ${VEHICLE_FIELDS}
       FROM vehicles v
       LEFT JOIN vehicle_categories c ON c.id = v.category_id
      WHERE ${where.join(' AND ')}
      ORDER BY v.sort_order ASC, v.id ASC
      LIMIT ?`,
    [...params, limit],
  );

  res.json({ vehicles: rows.map(shape) });
}

/** GET /api/vehicles/:slug - full detail plus photos, specs, cities and similar vehicles. */
async function detail(req, res) {
  const slug = str(req.params.slug);

  const rows = await query(
    `SELECT ${VEHICLE_FIELDS}
       FROM vehicles v
       LEFT JOIN vehicle_categories c ON c.id = v.category_id
      WHERE v.slug = ? AND v.is_visible = 1
      LIMIT 1`,
    [slug],
  );

  if (!rows.length) throw ApiError.notFound('Vehicle not found', 'vehicle_not_found');
  const vehicle = shape(rows[0]);

  const [photos, specs, cities, similar] = await Promise.all([
    query(
      `SELECT id, file_path, alt_text, is_cover
         FROM vehicle_photos WHERE vehicle_id = ?
        ORDER BY is_cover DESC, sort_order ASC, id ASC`,
      [vehicle.id],
    ),
    query(
      'SELECT spec_label, spec_value FROM vehicle_specs WHERE vehicle_id = ? ORDER BY sort_order ASC, id ASC',
      [vehicle.id],
    ),
    query(
      `SELECT ct.id, ct.name, ct.slug
         FROM vehicle_cities vc
         JOIN cities ct ON ct.id = vc.city_id
        WHERE vc.vehicle_id = ? AND ct.is_visible = 1
        ORDER BY ct.sort_order ASC`,
      [vehicle.id],
    ),
    query(
      `SELECT ${VEHICLE_FIELDS}
         FROM vehicles v
         LEFT JOIN vehicle_categories c ON c.id = v.category_id
        WHERE v.is_visible = 1 AND v.id <> ?
        ORDER BY (v.category_id = ?) DESC, v.sort_order ASC
        LIMIT 3`,
      [vehicle.id, vehicle.category_id],
    ),
  ]);

  const whatsappMessage = await buildMessage({ vehicle });

  res.json({
    vehicle: { ...vehicle, photos, specs, cities },
    similar: similar.map(shape),
    whatsappMessage,
  });
}

/** GET /api/categories */
async function listCategories(req, res) {
  const categories = await query(
    `SELECT c.id, c.name, c.slug, c.description, c.image, c.sort_order,
            (SELECT COUNT(*) FROM vehicles v WHERE v.category_id = c.id AND v.is_visible = 1) AS vehicle_count,
            (SELECT MIN(v.passengers) FROM vehicles v WHERE v.category_id = c.id AND v.is_visible = 1) AS min_passengers,
            (SELECT MAX(v.passengers) FROM vehicles v WHERE v.category_id = c.id AND v.is_visible = 1) AS max_passengers,
            (SELECT GROUP_CONCAT(v.name ORDER BY v.sort_order SEPARATOR ' · ')
               FROM vehicles v WHERE v.category_id = c.id AND v.is_visible = 1) AS examples,
            (SELECT p.file_path
               FROM vehicles v
               JOIN vehicle_photos p ON p.vehicle_id = v.id
              WHERE v.category_id = c.id AND v.is_visible = 1
              ORDER BY p.is_cover DESC, p.sort_order ASC
              LIMIT 1) AS sample_image
       FROM vehicle_categories c
      WHERE c.is_visible = 1
      ORDER BY c.sort_order ASC, c.id ASC`,
  );
  res.json({ categories });
}

/** GET /api/categories/:slug */
async function categoryDetail(req, res) {
  const slug = str(req.params.slug);

  const rows = await query(
    'SELECT id, name, slug, description, image FROM vehicle_categories WHERE slug = ? AND is_visible = 1 LIMIT 1',
    [slug],
  );
  if (!rows.length) throw ApiError.notFound('Category not found', 'category_not_found');

  const vehicles = await query(
    `SELECT ${VEHICLE_FIELDS}
       FROM vehicles v
       LEFT JOIN vehicle_categories c ON c.id = v.category_id
      WHERE v.is_visible = 1 AND v.category_id = ?
      ORDER BY v.sort_order ASC, v.id ASC`,
    [rows[0].id],
  );

  res.json({ category: rows[0], vehicles: vehicles.map(shape) });
}

module.exports = { list, detail, listCategories, categoryDetail, VEHICLE_FIELDS, shape };
