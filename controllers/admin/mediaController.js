'use strict';

const { query, execute } = require('../../config/db');
const { ApiError } = require('../../middleware/errorHandler');
const v = require('../../middleware/validate');
const { ensureUniqueSlug, slugForUpdate } = require('../../utils/slugify');
const crud = require('../../utils/crud');
const cascade = require('../../utils/cascade');
const { saveImage } = require('../../middleware/upload');
const { readPaging, meta, limitClause, dateRange } = require('../../utils/paginate');

/* ------------------------------------------------------------ gallery albums */
/* Albums ARE the categories shown on the public gallery page. */

async function listAlbums(req, res) {
  const paging = readPaging(req.query, { defaultPerPage: 50 });
  const limit = limitClause(paging);

  const [albums, [{ total }]] = await Promise.all([
    query(
      `SELECT a.*,
              (SELECT COUNT(*) FROM gallery_photos p WHERE p.album_id = a.id) AS photo_count
         FROM gallery_albums a
        ORDER BY a.sort_order ASC, a.id ASC
        ${limit.sql}`,
      limit.params,
    ),
    query('SELECT COUNT(*) AS total FROM gallery_albums'),
  ]);

  res.json({ albums, pagination: meta(paging, total) });
}

async function createAlbum(req, res) {
  const body = req.body || {};
  v.requireFields(body, ['name']);

  const name = v.str(body.name).slice(0, 120);
  const slug = await ensureUniqueSlug('gallery_albums', body.slug || name);
  const sortOrder = await crud.nextSortOrder('gallery_albums');

  const result = await execute(
    'INSERT INTO gallery_albums (name, slug, sort_order, is_visible) VALUES (?, ?, ?, ?)',
    [name, slug, sortOrder, v.bool(body.is_visible, 1)],
  );

  res.status(201).json({ id: result.insertId, slug, message: 'Album created.' });
}

async function updateAlbum(req, res) {
  const id = v.requireId(req.params.id);
  const existing = await crud.findOrFail('gallery_albums', id, 'Album');

  const body = req.body || {};
  v.requireFields(body, ['name']);

  const name = v.str(body.name).slice(0, 120);
  const slug = await slugForUpdate('gallery_albums', {
    existingSlug: existing.slug,
    requestedSlug: body.slug,
    name,
    id,
  });

  await execute('UPDATE gallery_albums SET name = ?, slug = ?, is_visible = ? WHERE id = ?', [
    name,
    slug,
    v.bool(body.is_visible, 1),
    id,
  ]);

  res.json({ id, slug, message: 'Album saved.' });
}

async function removeAlbum(req, res) {
  const id = v.requireId(req.params.id);
  await crud.findOrFail('gallery_albums', id, 'Album');
  await cascade.deleteAlbum(id);
  res.json({ message: 'Album and its photos deleted.' });
}

async function reorderAlbums(req, res) {
  const count = await crud.reorder('gallery_albums', req.body?.ids, req.body?.start);
  res.json({ message: `Reordered ${count} albums.` });
}

/* ------------------------------------------------------------ gallery photos */

async function listPhotos(req, res) {
  const albumId = v.int(req.query.album_id);

  const where = ['1 = 1'];
  const params = [];

  if (albumId) {
    where.push('p.album_id = ?');
    params.push(albumId);
  }

  const added = dateRange('p.created_at', req.query.date_from, req.query.date_to);
  where.push(...added.where);
  params.push(...added.params);

  const whereSql = where.join(' AND ');
  const paging = readPaging(req.query, { defaultPerPage: 24 });
  const limit = limitClause(paging);

  const [photos, [{ total }]] = await Promise.all([
    query(
      `SELECT p.*, a.name AS album_name, a.slug AS album_slug
         FROM gallery_photos p
         JOIN gallery_albums a ON a.id = p.album_id
        WHERE ${whereSql}
        ORDER BY p.sort_order ASC, p.id DESC
        ${limit.sql}`,
      [...params, ...limit.params],
    ),
    query(
      `SELECT COUNT(*) AS total
         FROM gallery_photos p
         JOIN gallery_albums a ON a.id = p.album_id
        WHERE ${whereSql}`,
      params,
    ),
  ]);

  res.json({ photos, pagination: meta(paging, total) });
}

/**
 * POST /api/admin/gallery/photos - multipart, field "images", requires album_id.
 * Photos always belong to an existing album, so every upload lands in a
 * category that the public gallery already displays.
 */
async function uploadPhotos(req, res) {
  const albumId = v.int(req.body?.album_id);
  if (!albumId) throw ApiError.badRequest('Choose an album for these photos.', 'missing_album');

  await crud.findOrFail('gallery_albums', albumId, 'Album');

  const files = req.files || [];
  if (!files.length) throw ApiError.badRequest('No images were uploaded.', 'no_files');

  const caption = v.nullable(req.body?.caption);
  let order = await crud.nextSortOrder('gallery_photos', 'WHERE album_id = ?', [albumId]);
  const created = [];

  for (const file of files) {
    const stored = await saveImage(file.buffer, 'gallery', { width: 1800, name: file.originalname });
    const result = await execute(
      'INSERT INTO gallery_photos (album_id, file_path, caption, alt_text, sort_order, is_visible) VALUES (?, ?, ?, ?, ?, 1)',
      [albumId, stored, caption, caption, order],
    );
    created.push({ id: result.insertId, file_path: stored, sort_order: order });
    order += 1;
  }

  res.status(201).json({ photos: created, message: `Uploaded ${created.length} photo(s).` });
}

async function updatePhoto(req, res) {
  const id = v.requireId(req.params.id);
  await crud.findOrFail('gallery_photos', id, 'Photo');

  const body = req.body || {};
  const albumId = v.int(body.album_id);
  if (albumId) await crud.findOrFail('gallery_albums', albumId, 'Album');

  await execute(
    `UPDATE gallery_photos SET
       album_id   = COALESCE(?, album_id),
       caption    = ?,
       alt_text   = ?,
       is_visible = ?
     WHERE id = ?`,
    [albumId, v.nullable(body.caption), v.nullable(body.alt_text ?? body.caption), v.bool(body.is_visible, 1), id],
  );

  res.json({ id, message: 'Photo saved.' });
}

async function removePhoto(req, res) {
  const id = v.requireId(req.params.id);
  await crud.findOrFail('gallery_photos', id, 'Photo');
  await cascade.deleteGalleryPhoto(id);
  res.json({ message: 'Photo deleted.' });
}

async function reorderPhotos(req, res) {
  const count = await crud.reorder('gallery_photos', req.body?.ids, req.body?.start);
  res.json({ message: `Reordered ${count} photos.` });
}

/* --------------------------------------------------------- generic uploader */

const UPLOAD_FOLDERS = new Set(['services', 'cities', 'testimonials', 'promotions', 'content', 'vehicles', 'gallery']);

/**
 * POST /api/admin/uploads - single image, field "image", body { folder }.
 * Used by the services / cities / content / promotions forms, which each
 * store one image path rather than a gallery.
 */
async function uploadSingle(req, res) {
  if (!req.file) throw ApiError.badRequest('No image was uploaded.', 'no_file');

  const folder = v.str(req.body?.folder) || 'content';
  if (!UPLOAD_FOLDERS.has(folder)) {
    throw ApiError.badRequest(`Unknown upload folder: ${folder}`, 'bad_folder');
  }

  const stored = await saveImage(req.file.buffer, folder, {
    width: 1800,
    name: req.file.originalname,
  });
  res.status(201).json({ path: stored, message: 'Image uploaded.' });
}

module.exports = {
  listAlbums,
  createAlbum,
  updateAlbum,
  removeAlbum,
  reorderAlbums,
  listPhotos,
  uploadPhotos,
  updatePhoto,
  removePhoto,
  reorderPhotos,
  uploadSingle,
};
