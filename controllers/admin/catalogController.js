'use strict';

const { query, execute, transaction } = require('../../config/db');
const { saveImage } = require('../../middleware/upload');
const { ApiError } = require('../../middleware/errorHandler');
const v = require('../../middleware/validate');
const { ensureUniqueSlug, slugForUpdate } = require('../../utils/slugify');
const crud = require('../../utils/crud');
const cascade = require('../../utils/cascade');
const { readPaging, meta, limitClause, dateRange } = require('../../utils/paginate');

/* -------------------------------------------------------- vehicle categories */

async function listCategories(req, res) {
  const q = v.str(req.query.q);
  const where = ['1 = 1'];
  const params = [];

  if (q) {
    where.push('c.name LIKE ?');
    params.push(`%${q}%`);
  }

  const added = dateRange('c.created_at', req.query.date_from, req.query.date_to);
  where.push(...added.where);
  params.push(...added.params);

  const whereSql = where.join(' AND ');
  const paging = readPaging(req.query);
  const limit = limitClause(paging);

  const [categories, [{ total }]] = await Promise.all([
    query(
      `SELECT c.*,
              (SELECT COUNT(*) FROM vehicles v WHERE v.category_id = c.id) AS vehicle_count,
              (SELECT COUNT(*) FROM category_photos p WHERE p.category_id = c.id) AS photo_count,
              COALESCE(
                (SELECT p.file_path FROM category_photos p
                  WHERE p.category_id = c.id AND p.is_cover = 1 LIMIT 1),
                (SELECT p.file_path FROM category_photos p
                  WHERE p.category_id = c.id ORDER BY p.sort_order ASC, p.id ASC LIMIT 1),
                c.image
              ) AS cover_image
         FROM vehicle_categories c
        WHERE ${whereSql}
        ORDER BY c.sort_order ASC, c.id ASC
        ${limit.sql}`,
      [...params, ...limit.params],
    ),
    query(`SELECT COUNT(*) AS total FROM vehicle_categories c WHERE ${whereSql}`, params),
  ]);

  res.json({ categories, pagination: meta(paging, total) });
}

/** GET /api/admin/categories/:id - the form loads its photos from here. */
async function categoryDetail(req, res) {
  const id = v.requireId(req.params.id);
  const category = await crud.findOrFail('vehicle_categories', id, 'Category');

  category.photos = await query(
    `SELECT id, file_path, alt_text, sort_order, is_cover
       FROM category_photos WHERE category_id = ? ORDER BY sort_order ASC, id ASC`,
    [id],
  );

  res.json({ category });
}

/* ----------------------------------------------------------- category photos */

/** Keep vehicle_categories.image pointing at the cover, which cards read. */
async function syncCategoryCover(categoryId) {
  const rows = await query(
    `SELECT file_path FROM category_photos
      WHERE category_id = ? ORDER BY is_cover DESC, sort_order ASC, id ASC LIMIT 1`,
    [categoryId],
  );
  await execute('UPDATE vehicle_categories SET image = ? WHERE id = ?', [
    rows.length ? rows[0].file_path : null,
    categoryId,
  ]);
}

/** POST /api/admin/categories/:id/photos - multipart, field name "images". */
async function uploadCategoryPhotos(req, res) {
  const id = v.requireId(req.params.id);
  const category = await crud.findOrFail('vehicle_categories', id, 'Category');

  const files = req.files || [];
  if (!files.length) throw ApiError.badRequest('No images were uploaded.', 'no_files');

  const [{ existing }] = await query(
    'SELECT COUNT(*) AS existing FROM category_photos WHERE category_id = ?',
    [id],
  );

  let order = await crud.nextSortOrder('category_photos', 'WHERE category_id = ?', [id]);
  const created = [];

  for (let i = 0; i < files.length; i += 1) {
    const stored = await saveImage(files[i].buffer, 'categories', {
      width: 1800,
      name: files[i].originalname,
    });
    const isCover = Number(existing) === 0 && i === 0 ? 1 : 0;

    const result = await execute(
      'INSERT INTO category_photos (category_id, file_path, alt_text, sort_order, is_cover) VALUES (?, ?, ?, ?, ?)',
      [id, stored, `${category.name} - photo ${Number(existing) + i + 1}`, order, isCover],
    );

    created.push({ id: result.insertId, file_path: stored, sort_order: order, is_cover: isCover });
    order += 1;
  }

  await syncCategoryCover(id);
  res.status(201).json({ photos: created, message: `Uploaded ${created.length} photo(s).` });
}

async function removeCategoryPhoto(req, res) {
  const id = v.requireId(req.params.id);
  const photoId = v.requireId(req.params.photoId, 'photo id');
  await cascade.deleteCategoryPhoto(photoId);
  await syncCategoryCover(id);
  res.json({ message: 'Photo deleted.' });
}

async function reorderCategoryPhotos(req, res) {
  const id = v.requireId(req.params.id);
  const count = await crud.reorder('category_photos', req.body?.ids, req.body?.start);
  await syncCategoryCover(id);
  res.json({ message: `Reordered ${count} photos.` });
}

/** PATCH /api/admin/categories/:id/photos/:photoId/cover */
async function setCategoryCover(req, res) {
  const id = v.requireId(req.params.id);
  const photoId = v.requireId(req.params.photoId, 'photo id');

  const rows = await query('SELECT id FROM category_photos WHERE id = ? AND category_id = ? LIMIT 1', [photoId, id]);
  if (!rows.length) throw ApiError.notFound('That photo does not belong to this category.');

  await transaction(async (conn) => {
    await conn.execute('UPDATE category_photos SET is_cover = 0 WHERE category_id = ?', [id]);
    await conn.execute('UPDATE category_photos SET is_cover = 1 WHERE id = ?', [photoId]);
  });

  await syncCategoryCover(id);
  res.json({ message: 'Cover image updated.', cover_id: photoId });
}

async function createCategory(req, res) {
  const body = req.body || {};
  v.requireFields(body, ['name']);

  const name = v.str(body.name).slice(0, 120);
  const slug = await ensureUniqueSlug('vehicle_categories', body.slug || name);
  const sortOrder = await crud.nextSortOrder('vehicle_categories');

  const result = await execute(
    'INSERT INTO vehicle_categories (name, slug, description, sort_order, is_visible) VALUES (?, ?, ?, ?, ?)',
    [name, slug, v.nullable(body.description), sortOrder, v.bool(body.is_visible, 1)],
  );

  res.status(201).json({ id: result.insertId, slug, message: 'Category created.' });
}

async function updateCategory(req, res) {
  const id = v.requireId(req.params.id);
  const existing = await crud.findOrFail('vehicle_categories', id, 'Category');

  const body = req.body || {};
  v.requireFields(body, ['name']);

  const name = v.str(body.name).slice(0, 120);
  const slug = await slugForUpdate('vehicle_categories', {
    existingSlug: existing.slug,
    requestedSlug: body.slug,
    name,
    id,
  });

  // As with services, the cover column belongs to the photo endpoints.
  await execute(
    'UPDATE vehicle_categories SET name = ?, slug = ?, description = ?, is_visible = ? WHERE id = ?',
    [name, slug, v.nullable(body.description), v.bool(body.is_visible, 1), id],
  );

  res.json({ id, slug, message: 'Category saved.' });
}

async function removeCategory(req, res) {
  const id = v.requireId(req.params.id);
  await crud.findOrFail('vehicle_categories', id, 'Category');
  await cascade.deleteCategory(id);
  res.json({ message: 'Category deleted.' });
}

/* ------------------------------------------------------------------ services */

async function listServices(req, res) {
  const q = v.str(req.query.q);
  const where = ['1 = 1'];
  const params = [];

  if (q) {
    where.push('(name LIKE ? OR short_description LIKE ?)');
    params.push(`%${q}%`, `%${q}%`);
  }

  const added = dateRange('created_at', req.query.date_from, req.query.date_to);
  where.push(...added.where);
  params.push(...added.params);

  const whereSql = where.join(' AND ');
  const paging = readPaging(req.query);
  const limit = limitClause(paging);

  // The list shows a thumbnail and a photo count, so both come back with the row.
  const [services, [{ total }]] = await Promise.all([
    query(
      `SELECT s.*,
              (SELECT COUNT(*) FROM service_photos p WHERE p.service_id = s.id) AS photo_count,
              COALESCE(
                (SELECT p.file_path FROM service_photos p
                  WHERE p.service_id = s.id AND p.is_cover = 1 LIMIT 1),
                (SELECT p.file_path FROM service_photos p
                  WHERE p.service_id = s.id ORDER BY p.sort_order ASC, p.id ASC LIMIT 1),
                s.image
              ) AS cover_image
         FROM services s
        WHERE ${whereSql}
        ORDER BY s.sort_order ASC, s.id ASC ${limit.sql}`,
      [...params, ...limit.params],
    ),
    query(`SELECT COUNT(*) AS total FROM services WHERE ${whereSql}`, params),
  ]);

  res.json({ services, pagination: meta(paging, total) });
}

async function serviceDetail(req, res) {
  const id = v.requireId(req.params.id);
  const service = await crud.findOrFail('services', id, 'Service');

  service.photos = await query(
    `SELECT id, file_path, alt_text, sort_order, is_cover
       FROM service_photos WHERE service_id = ? ORDER BY sort_order ASC, id ASC`,
    [id],
  );

  res.json({ service });
}

/* ------------------------------------------------------------ service photos */

/** Keep services.image pointing at the cover, since cards read that column. */
async function syncServiceCover(serviceId) {
  const rows = await query(
    `SELECT file_path FROM service_photos
      WHERE service_id = ? ORDER BY is_cover DESC, sort_order ASC, id ASC LIMIT 1`,
    [serviceId],
  );
  await execute('UPDATE services SET image = ? WHERE id = ?', [rows.length ? rows[0].file_path : null, serviceId]);
}

/** POST /api/admin/services/:id/photos - multipart, field name "images". */
async function uploadServicePhotos(req, res) {
  const id = v.requireId(req.params.id);
  const service = await crud.findOrFail('services', id, 'Service');

  const files = req.files || [];
  if (!files.length) throw ApiError.badRequest('No images were uploaded.', 'no_files');

  const [{ existing }] = await query(
    'SELECT COUNT(*) AS existing FROM service_photos WHERE service_id = ?',
    [id],
  );

  let order = await crud.nextSortOrder('service_photos', 'WHERE service_id = ?', [id]);
  const created = [];

  for (let i = 0; i < files.length; i += 1) {
    const stored = await saveImage(files[i].buffer, 'services', {
      width: 1800,
      name: files[i].originalname,
    });
    // The first photo a service gets becomes its cover automatically.
    const isCover = Number(existing) === 0 && i === 0 ? 1 : 0;

    const result = await execute(
      'INSERT INTO service_photos (service_id, file_path, alt_text, sort_order, is_cover) VALUES (?, ?, ?, ?, ?)',
      [id, stored, `${service.name} - photo ${Number(existing) + i + 1}`, order, isCover],
    );

    created.push({ id: result.insertId, file_path: stored, sort_order: order, is_cover: isCover });
    order += 1;
  }

  await syncServiceCover(id);
  res.status(201).json({ photos: created, message: `Uploaded ${created.length} photo(s).` });
}

async function removeServicePhoto(req, res) {
  const id = v.requireId(req.params.id);
  const photoId = v.requireId(req.params.photoId, 'photo id');
  await cascade.deleteServicePhoto(photoId);
  await syncServiceCover(id);
  res.json({ message: 'Photo deleted.' });
}

async function reorderServicePhotos(req, res) {
  const id = v.requireId(req.params.id);
  const count = await crud.reorder('service_photos', req.body?.ids, req.body?.start);
  await syncServiceCover(id);
  res.json({ message: `Reordered ${count} photos.` });
}

/** PATCH /api/admin/services/:id/photos/:photoId/cover */
async function setServiceCover(req, res) {
  const id = v.requireId(req.params.id);
  const photoId = v.requireId(req.params.photoId, 'photo id');

  const rows = await query('SELECT id FROM service_photos WHERE id = ? AND service_id = ? LIMIT 1', [photoId, id]);
  if (!rows.length) throw ApiError.notFound('That photo does not belong to this service.');

  await transaction(async (conn) => {
    await conn.execute('UPDATE service_photos SET is_cover = 0 WHERE service_id = ?', [id]);
    await conn.execute('UPDATE service_photos SET is_cover = 1 WHERE id = ?', [photoId]);
  });

  await syncServiceCover(id);
  res.json({ message: 'Cover image updated.', cover_id: photoId });
}

function readService(body) {
  return {
    name: v.str(body.name).slice(0, 160),
    short_description: v.nullable(body.short_description),
    full_description: v.nullable(body.full_description),
    included: v.nullable(body.included),
    icon: v.nullable(body.icon),
    price_text: v.nullable(body.price_text),
    is_visible: v.bool(body.is_visible, 1),
    show_on_homepage: v.bool(body.show_on_homepage, 1),
  };
}

async function createService(req, res) {
  const body = req.body || {};
  v.requireFields(body, ['name']);

  const f = readService(body);
  const slug = await ensureUniqueSlug('services', body.slug || f.name);
  const sortOrder = await crud.nextSortOrder('services');

  // A brand new service has no photos yet, so no cover: the first upload sets it.
  const result = await execute(
    `INSERT INTO services
       (name, slug, short_description, full_description, included, icon,
        price_text, sort_order, is_visible, show_on_homepage)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      f.name, slug, f.short_description, f.full_description, f.included, f.icon,
      f.price_text, sortOrder, f.is_visible, f.show_on_homepage,
    ],
  );

  res.status(201).json({ id: result.insertId, slug, message: 'Service created.' });
}

async function updateService(req, res) {
  const id = v.requireId(req.params.id);
  const existing = await crud.findOrFail('services', id, 'Service');

  const body = req.body || {};
  v.requireFields(body, ['name']);

  const f = readService(body);
  const slug = await slugForUpdate('services', {
    existingSlug: existing.slug,
    requestedSlug: body.slug,
    name: f.name,
    id,
  });

  // `image` is deliberately absent: it mirrors the cover photo and is kept up
  // to date by the photo endpoints, so a save here must leave it alone.
  await execute(
    `UPDATE services SET
       name = ?, slug = ?, short_description = ?, full_description = ?, included = ?,
       icon = ?, price_text = ?, is_visible = ?, show_on_homepage = ?
     WHERE id = ?`,
    [
      f.name, slug, f.short_description, f.full_description, f.included,
      f.icon, f.price_text, f.is_visible, f.show_on_homepage, id,
    ],
  );

  res.json({ id, slug, message: 'Service saved.' });
}

async function removeService(req, res) {
  const id = v.requireId(req.params.id);
  await crud.findOrFail('services', id, 'Service');
  await cascade.deleteService(id);
  res.json({ message: 'Service deleted.' });
}

/* -------------------------------------------------------------------- cities */

async function listCities(req, res) {
  const q = v.str(req.query.q);
  const where = ['1 = 1'];
  const params = [];

  if (q) {
    where.push('(c.name LIKE ? OR c.hub_label LIKE ?)');
    params.push(`%${q}%`, `%${q}%`);
  }

  const added = dateRange('c.created_at', req.query.date_from, req.query.date_to);
  where.push(...added.where);
  params.push(...added.params);

  const whereSql = where.join(' AND ');
  const paging = readPaging(req.query);
  const limit = limitClause(paging);

  const [cities, [{ total }]] = await Promise.all([
    query(
      `SELECT c.*,
              (SELECT COUNT(*) FROM vehicle_cities vc WHERE vc.city_id = c.id) AS vehicle_count
         FROM cities c
        WHERE ${whereSql}
        ORDER BY c.sort_order ASC, c.id ASC
        ${limit.sql}`,
      [...params, ...limit.params],
    ),
    query(`SELECT COUNT(*) AS total FROM cities c WHERE ${whereSql}`, params),
  ]);

  res.json({ cities, pagination: meta(paging, total) });
}

function readCity(body) {
  return {
    name: v.str(body.name).slice(0, 120),
    hub_label: v.nullable(body.hub_label),
    intro: v.nullable(body.intro),
    description: v.nullable(body.description),
    image: v.nullable(body.image),
    lat: v.dec(body.lat),
    lng: v.dec(body.lng),
    is_visible: v.bool(body.is_visible, 1),
  };
}

async function createCity(req, res) {
  const body = req.body || {};
  v.requireFields(body, ['name']);

  const f = readCity(body);
  const slug = await ensureUniqueSlug('cities', body.slug || f.name);
  const sortOrder = await crud.nextSortOrder('cities');

  const result = await execute(
    `INSERT INTO cities (name, slug, hub_label, intro, description, image, lat, lng, sort_order, is_visible)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [f.name, slug, f.hub_label, f.intro, f.description, f.image, f.lat, f.lng, sortOrder, f.is_visible],
  );

  res.status(201).json({ id: result.insertId, slug, message: 'City created.' });
}

async function updateCity(req, res) {
  const id = v.requireId(req.params.id);
  const existing = await crud.findOrFail('cities', id, 'City');

  const body = req.body || {};
  v.requireFields(body, ['name']);

  const f = readCity(body);
  const slug = await slugForUpdate('cities', {
    existingSlug: existing.slug,
    requestedSlug: body.slug,
    name: f.name,
    id,
  });

  await execute(
    `UPDATE cities SET name = ?, slug = ?, hub_label = ?, intro = ?, description = ?,
            image = ?, lat = ?, lng = ?, is_visible = ?
     WHERE id = ?`,
    [f.name, slug, f.hub_label, f.intro, f.description, f.image, f.lat, f.lng, f.is_visible, id],
  );

  res.json({ id, slug, message: 'City saved.' });
}

async function removeCity(req, res) {
  const id = v.requireId(req.params.id);
  await crud.findOrFail('cities', id, 'City');
  await cascade.deleteCity(id);
  res.json({ message: 'City deleted.' });
}

/* ------------------------------------------- generic reorder / visibility ops */

function makeReorder(table) {
  return async function handler(req, res) {
    const count = await crud.reorder(table, req.body?.ids, req.body?.start);
    res.json({ message: `Reordered ${count} items.` });
  };
}

function makeToggle(table, column) {
  return async function handler(req, res) {
    const id = v.requireId(req.params.id);
    const raw = req.body?.[column];
    const next = await crud.toggle(table, column, id, raw === undefined ? null : v.bool(raw));
    res.json({ id, [column]: next });
  };
}

module.exports = {
  listCategories,
  categoryDetail,
  uploadCategoryPhotos,
  removeCategoryPhoto,
  reorderCategoryPhotos,
  setCategoryCover,
  createCategory,
  updateCategory,
  removeCategory,
  reorderCategories: makeReorder('vehicle_categories'),
  toggleCategory: makeToggle('vehicle_categories', 'is_visible'),

  listServices,
  serviceDetail,
  createService,
  updateService,
  removeService,
  uploadServicePhotos,
  removeServicePhoto,
  reorderServicePhotos,
  setServiceCover,
  reorderServices: makeReorder('services'),
  toggleService: makeToggle('services', 'is_visible'),
  toggleServiceHome: makeToggle('services', 'show_on_homepage'),

  listCities,
  createCity,
  updateCity,
  removeCity,
  reorderCities: makeReorder('cities'),
  toggleCity: makeToggle('cities', 'is_visible'),
};
