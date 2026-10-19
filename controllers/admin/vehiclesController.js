'use strict';

const { query, execute, transaction } = require('../../config/db');
const { ApiError } = require('../../middleware/errorHandler');
const v = require('../../middleware/validate');
const { ensureUniqueSlug, slugForUpdate } = require('../../utils/slugify');
const crud = require('../../utils/crud');
const { readPaging, meta, limitClause, dateRange } = require('../../utils/paginate');
const cascade = require('../../utils/cascade');
const { saveImage } = require('../../middleware/upload');

/** GET /api/admin/vehicles?q=&category=&visible=&date_from=&date_to=&page=&per_page= */
async function list(req, res) {
  const q = v.str(req.query.q);
  const category = v.int(req.query.category);
  const visible = v.str(req.query.visible);

  const where = ['1 = 1'];
  const params = [];

  if (q) {
    where.push('(v.name LIKE ? OR v.slug LIKE ? OR v.tagline LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like, like);
  }
  if (category) {
    where.push('v.category_id = ?');
    params.push(category);
  }
  if (visible === '1' || visible === '0') {
    where.push('v.is_visible = ?');
    params.push(Number(visible));
  }

  const added = dateRange('v.created_at', req.query.date_from, req.query.date_to);
  where.push(...added.where);
  params.push(...added.params);

  const whereSql = where.join(' AND ');
  const paging = readPaging(req.query);
  const limit = limitClause(paging);

  const [vehicles, [{ total }]] = await Promise.all([
    query(
      `SELECT v.id, v.name, v.slug, v.passengers, v.suitcases, v.is_visible, v.is_featured,
              v.sort_order, v.created_at, v.updated_at,
              c.name AS category_name,
              (SELECT p.file_path FROM vehicle_photos p
                WHERE p.vehicle_id = v.id ORDER BY p.is_cover DESC, p.sort_order ASC LIMIT 1) AS cover_image,
              (SELECT COUNT(*) FROM vehicle_photos p WHERE p.vehicle_id = v.id) AS photo_count,
              (SELECT GROUP_CONCAT(ct.name ORDER BY ct.sort_order SEPARATOR ', ')
                 FROM vehicle_cities vc JOIN cities ct ON ct.id = vc.city_id
                WHERE vc.vehicle_id = v.id) AS cities
         FROM vehicles v
         LEFT JOIN vehicle_categories c ON c.id = v.category_id
        WHERE ${whereSql}
        ORDER BY v.sort_order ASC, v.id ASC
        ${limit.sql}`,
      [...params, ...limit.params],
    ),
    query(
      `SELECT COUNT(*) AS total
         FROM vehicles v
         LEFT JOIN vehicle_categories c ON c.id = v.category_id
        WHERE ${whereSql}`,
      params,
    ),
  ]);

  res.json({ vehicles, pagination: meta(paging, total) });
}

/** GET /api/admin/vehicles/:id - the full record the edit form needs. */
async function detail(req, res) {
  const id = v.requireId(req.params.id);
  const vehicle = await crud.findOrFail('vehicles', id, 'Vehicle');

  const [photos, specs, cities] = await Promise.all([
    query(
      'SELECT id, file_path, alt_text, sort_order, is_cover FROM vehicle_photos WHERE vehicle_id = ? ORDER BY sort_order ASC, id ASC',
      [id],
    ),
    query(
      'SELECT id, spec_label, spec_value, sort_order FROM vehicle_specs WHERE vehicle_id = ? ORDER BY sort_order ASC, id ASC',
      [id],
    ),
    query('SELECT city_id FROM vehicle_cities WHERE vehicle_id = ?', [id]),
  ]);

  res.json({
    vehicle: {
      ...vehicle,
      price_from: vehicle.price_from === null ? null : Number(vehicle.price_from),
      photos,
      specs,
      city_ids: cities.map((c) => c.city_id),
    },
  });
}

/** Shared field mapping for create and update. */
function readBody(body) {
  return {
    category_id: v.int(body.category_id),
    name: v.str(body.name).slice(0, 160),
    tagline: v.nullable(body.tagline),
    description: v.nullable(body.description),
    passengers: v.int(body.passengers) ?? 3,
    suitcases: v.int(body.suitcases) ?? 2,
    hand_bags: v.int(body.hand_bags) ?? 2,
    price_from: v.dec(body.price_from),
    price_unit: v.str(body.price_unit) || 'hour',
    price_note: v.nullable(body.price_note),
    ideal_for: v.nullable(body.ideal_for),
    whatsapp_template: v.nullable(body.whatsapp_template),
    is_visible: v.bool(body.is_visible, 1),
    is_featured: v.bool(body.is_featured, 0),
  };
}

/**
 * Specs and city links arrive as whole arrays and are replaced wholesale.
 * Simpler and less error-prone than diffing, and these lists are small.
 */
async function replaceSpecs(conn, vehicleId, specs) {
  await conn.execute('DELETE FROM vehicle_specs WHERE vehicle_id = ?', [vehicleId]);
  if (!Array.isArray(specs)) return;

  let order = 0;
  for (const spec of specs) {
    const label = v.str(spec?.spec_label ?? spec?.label);
    const value = v.str(spec?.spec_value ?? spec?.value);
    if (!label || !value) continue;
    order += 1;
    await conn.execute(
      'INSERT INTO vehicle_specs (vehicle_id, spec_label, spec_value, sort_order) VALUES (?, ?, ?, ?)',
      [vehicleId, label.slice(0, 120), value.slice(0, 255), order],
    );
  }
}

async function replaceCities(conn, vehicleId, cityIds) {
  await conn.execute('DELETE FROM vehicle_cities WHERE vehicle_id = ?', [vehicleId]);
  if (!Array.isArray(cityIds)) return;

  const unique = [...new Set(cityIds.map((id) => Number.parseInt(id, 10)).filter(Boolean))];
  for (const cityId of unique) {
    await conn.execute('INSERT IGNORE INTO vehicle_cities (vehicle_id, city_id) VALUES (?, ?)', [
      vehicleId,
      cityId,
    ]);
  }
}

/** POST /api/admin/vehicles */
async function create(req, res) {
  const body = req.body || {};
  v.requireFields(body, ['name']);

  const fields = readBody(body);
  const slug = await ensureUniqueSlug('vehicles', body.slug || fields.name);
  const sortOrder = await crud.nextSortOrder('vehicles');

  const id = await transaction(async (conn) => {
    const [result] = await conn.execute(
      `INSERT INTO vehicles
         (category_id, name, slug, tagline, description, passengers, suitcases, hand_bags,
          price_from, price_unit, price_note, ideal_for, whatsapp_template,
          is_visible, is_featured, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        fields.category_id, fields.name, slug, fields.tagline, fields.description,
        fields.passengers, fields.suitcases, fields.hand_bags,
        fields.price_from, fields.price_unit, fields.price_note, fields.ideal_for,
        fields.whatsapp_template, fields.is_visible, fields.is_featured, sortOrder,
      ],
    );

    const newId = result.insertId;
    await replaceSpecs(conn, newId, body.specs);
    await replaceCities(conn, newId, body.city_ids);
    return newId;
  });

  res.status(201).json({ id, slug, message: 'Vehicle created.' });
}

/** PUT /api/admin/vehicles/:id */
async function update(req, res) {
  const id = v.requireId(req.params.id);
  const existing = await crud.findOrFail('vehicles', id, 'Vehicle');

  const body = req.body || {};
  v.requireFields(body, ['name']);

  const fields = readBody(body);
  const slug = await slugForUpdate('vehicles', {
    existingSlug: existing.slug,
    requestedSlug: body.slug,
    name: fields.name,
    id,
  });

  await transaction(async (conn) => {
    await conn.execute(
      `UPDATE vehicles SET
         category_id = ?, name = ?, slug = ?, tagline = ?, description = ?,
         passengers = ?, suitcases = ?, hand_bags = ?,
         price_from = ?, price_unit = ?, price_note = ?, ideal_for = ?,
         whatsapp_template = ?, is_visible = ?, is_featured = ?
       WHERE id = ?`,
      [
        fields.category_id, fields.name, slug, fields.tagline, fields.description,
        fields.passengers, fields.suitcases, fields.hand_bags,
        fields.price_from, fields.price_unit, fields.price_note, fields.ideal_for,
        fields.whatsapp_template, fields.is_visible, fields.is_featured, id,
      ],
    );

    if (body.specs !== undefined) await replaceSpecs(conn, id, body.specs);
    if (body.city_ids !== undefined) await replaceCities(conn, id, body.city_ids);
  });

  res.json({ id, slug, message: 'Vehicle saved.' });
}

/** DELETE /api/admin/vehicles/:id - photos, specs and city links go with it. */
async function remove(req, res) {
  const id = v.requireId(req.params.id);
  await crud.findOrFail('vehicles', id, 'Vehicle');
  await cascade.deleteVehicle(id);
  res.json({ message: 'Vehicle deleted.' });
}

async function setVisibility(req, res) {
  const id = v.requireId(req.params.id);
  const value = req.body?.is_visible === undefined ? null : v.bool(req.body.is_visible);
  const next = await crud.toggle('vehicles', 'is_visible', id, value);
  res.json({ id, is_visible: next });
}

async function setFeatured(req, res) {
  const id = v.requireId(req.params.id);
  const value = req.body?.is_featured === undefined ? null : v.bool(req.body.is_featured);
  const next = await crud.toggle('vehicles', 'is_featured', id, value);
  res.json({ id, is_featured: next });
}

async function reorder(req, res) {
  const count = await crud.reorder('vehicles', req.body?.ids, req.body?.start);
  res.json({ message: `Reordered ${count} vehicles.` });
}

/* -------------------------------------------------------------------- photos */

/** POST /api/admin/vehicles/:id/photos - multipart, field name "images". */
async function uploadPhotos(req, res) {
  const id = v.requireId(req.params.id);
  const vehicle = await crud.findOrFail('vehicles', id, 'Vehicle');

  const files = req.files || [];
  if (!files.length) throw ApiError.badRequest('No images were uploaded.', 'no_files');

  const [{ existing }] = await query(
    'SELECT COUNT(*) AS existing FROM vehicle_photos WHERE vehicle_id = ?',
    [id],
  );

  let order = await crud.nextSortOrder('vehicle_photos', 'WHERE vehicle_id = ?', [id]);
  const created = [];

  for (let i = 0; i < files.length; i += 1) {
    const stored = await saveImage(files[i].buffer, 'vehicles', {
      width: 1800,
      name: files[i].originalname,
    });
    // The very first photo of a vehicle becomes the cover automatically.
    const isCover = Number(existing) === 0 && i === 0 ? 1 : 0;

    const result = await execute(
      'INSERT INTO vehicle_photos (vehicle_id, file_path, alt_text, sort_order, is_cover) VALUES (?, ?, ?, ?, ?)',
      [id, stored, `${vehicle.name} - photo ${Number(existing) + i + 1}`, order, isCover],
    );

    created.push({ id: result.insertId, file_path: stored, sort_order: order, is_cover: isCover });
    order += 1;
  }

  res.status(201).json({ photos: created, message: `Uploaded ${created.length} photo(s).` });
}

async function deletePhoto(req, res) {
  const photoId = v.requireId(req.params.photoId, 'photo id');
  await cascade.deleteVehiclePhoto(photoId);
  res.json({ message: 'Photo deleted.' });
}

async function reorderPhotos(req, res) {
  const count = await crud.reorder('vehicle_photos', req.body?.ids, req.body?.start);
  res.json({ message: `Reordered ${count} photos.` });
}

/** PATCH /api/admin/vehicles/:id/photos/:photoId/cover */
async function setCover(req, res) {
  const id = v.requireId(req.params.id);
  const photoId = v.requireId(req.params.photoId, 'photo id');

  const rows = await query('SELECT id FROM vehicle_photos WHERE id = ? AND vehicle_id = ? LIMIT 1', [photoId, id]);
  if (!rows.length) throw ApiError.notFound('That photo does not belong to this vehicle.');

  await transaction(async (conn) => {
    await conn.execute('UPDATE vehicle_photos SET is_cover = 0 WHERE vehicle_id = ?', [id]);
    await conn.execute('UPDATE vehicle_photos SET is_cover = 1 WHERE id = ?', [photoId]);
  });

  res.json({ message: 'Cover image updated.', cover_id: photoId });
}

/** PUT /api/admin/vehicles/:id/specs */
async function putSpecs(req, res) {
  const id = v.requireId(req.params.id);
  await crud.findOrFail('vehicles', id, 'Vehicle');
  await transaction((conn) => replaceSpecs(conn, id, req.body?.specs));
  res.json({ message: 'Specifications saved.' });
}

/** PUT /api/admin/vehicles/:id/cities */
async function putCities(req, res) {
  const id = v.requireId(req.params.id);
  await crud.findOrFail('vehicles', id, 'Vehicle');
  await transaction((conn) => replaceCities(conn, id, req.body?.city_ids));
  res.json({ message: 'Cities saved.' });
}

module.exports = {
  list,
  detail,
  create,
  update,
  remove,
  setVisibility,
  setFeatured,
  reorder,
  uploadPhotos,
  deletePhoto,
  reorderPhotos,
  setCover,
  putSpecs,
  putCities,
};
