'use strict';

/**
 * Cascading deletes, in code.
 *
 * The schema deliberately has NO foreign keys, so every delete that would
 * normally rely on ON DELETE CASCADE / SET NULL is implemented here instead.
 * Routes must call these helpers rather than issuing a bare DELETE, otherwise
 * child rows and uploaded files are orphaned.
 */

const { query, execute, transaction } = require('../config/db');
const { deleteFile } = require('../middleware/upload');
const { ApiError } = require('../middleware/errorHandler');

/**
 * Delete a vehicle and everything that points at it:
 *   vehicle_photos (rows + files), vehicle_specs, vehicle_cities
 * Enquiries and WhatsApp clicks are KEPT for reporting, with their
 * vehicle_id nulled - the denormalised vehicle_name column preserves history.
 */
async function deleteVehicle(vehicleId) {
  const photos = await query('SELECT file_path FROM vehicle_photos WHERE vehicle_id = ?', [vehicleId]);

  await transaction(async (conn) => {
    await conn.execute('DELETE FROM vehicle_photos WHERE vehicle_id = ?', [vehicleId]);
    await conn.execute('DELETE FROM vehicle_specs  WHERE vehicle_id = ?', [vehicleId]);
    await conn.execute('DELETE FROM vehicle_cities WHERE vehicle_id = ?', [vehicleId]);
    await conn.execute('UPDATE enquiries       SET vehicle_id = NULL WHERE vehicle_id = ?', [vehicleId]);
    await conn.execute('UPDATE whatsapp_clicks SET vehicle_id = NULL WHERE vehicle_id = ?', [vehicleId]);
    await conn.execute('DELETE FROM vehicles WHERE id = ?', [vehicleId]);
  });

  photos.forEach((p) => deleteFile(p.file_path));
}

/**
 * Delete a vehicle category. Refuses while vehicles still reference it so the
 * admin makes a deliberate choice instead of silently orphaning the fleet.
 */
async function deleteCategory(categoryId) {
  const [{ total }] = await query('SELECT COUNT(*) AS total FROM vehicles WHERE category_id = ?', [categoryId]);

  if (total > 0) {
    throw ApiError.conflict(
      `This category still has ${total} vehicle${total === 1 ? '' : 's'}. Move them to another category first.`,
      'category_in_use',
    );
  }

  const row = await query('SELECT image FROM vehicle_categories WHERE id = ?', [categoryId]);
  const photos = await query('SELECT file_path FROM category_photos WHERE category_id = ?', [categoryId]);

  await transaction(async (conn) => {
    await conn.execute('DELETE FROM category_photos WHERE category_id = ?', [categoryId]);
    await conn.execute('DELETE FROM vehicle_categories WHERE id = ?', [categoryId]);
  });

  photos.forEach((p) => deleteFile(p.file_path));
  if (row.length && !photos.some((p) => p.file_path === row[0].image)) deleteFile(row[0].image);
}

/**
 * Delete one category photo, promoting the next in order when the cover goes,
 * so vehicle_categories.image never points at a missing file.
 */
async function deleteCategoryPhoto(photoId) {
  const rows = await query('SELECT category_id, file_path, is_cover FROM category_photos WHERE id = ?', [photoId]);
  if (!rows.length) throw ApiError.notFound('Photo not found');
  const photo = rows[0];

  await execute('DELETE FROM category_photos WHERE id = ?', [photoId]);
  deleteFile(photo.file_path);

  if (photo.is_cover) {
    const next = await query(
      'SELECT id, file_path FROM category_photos WHERE category_id = ? ORDER BY sort_order ASC, id ASC LIMIT 1',
      [photo.category_id],
    );
    if (next.length) {
      await execute('UPDATE category_photos SET is_cover = 1 WHERE id = ?', [next[0].id]);
      await execute('UPDATE vehicle_categories SET image = ? WHERE id = ?', [next[0].file_path, photo.category_id]);
    } else {
      await execute('UPDATE vehicle_categories SET image = NULL WHERE id = ?', [photo.category_id]);
    }
  }
}

/** Delete a gallery album together with its photos and their files. */
async function deleteAlbum(albumId) {
  const photos = await query('SELECT file_path FROM gallery_photos WHERE album_id = ?', [albumId]);

  await transaction(async (conn) => {
    await conn.execute('DELETE FROM gallery_photos WHERE album_id = ?', [albumId]);
    await conn.execute('DELETE FROM gallery_albums WHERE id = ?', [albumId]);
  });

  photos.forEach((p) => deleteFile(p.file_path));
}

/** Delete a city and unlink it from every vehicle. */
async function deleteCity(cityId) {
  const row = await query('SELECT image FROM cities WHERE id = ?', [cityId]);

  await transaction(async (conn) => {
    await conn.execute('DELETE FROM vehicle_cities WHERE city_id = ?', [cityId]);
    await conn.execute('DELETE FROM cities WHERE id = ?', [cityId]);
  });

  if (row.length) deleteFile(row[0].image);
}

/** Delete a service together with its photos and their files. */
async function deleteService(serviceId) {
  const row = await query('SELECT image FROM services WHERE id = ?', [serviceId]);
  const photos = await query('SELECT file_path FROM service_photos WHERE service_id = ?', [serviceId]);

  await transaction(async (conn) => {
    await conn.execute('DELETE FROM service_photos WHERE service_id = ?', [serviceId]);
    await conn.execute('DELETE FROM services WHERE id = ?', [serviceId]);
  });

  photos.forEach((p) => deleteFile(p.file_path));
  // The cover is mirrored into services.image, so only remove it when no photo
  // row already claimed that file.
  if (row.length && !photos.some((p) => p.file_path === row[0].image)) deleteFile(row[0].image);
}

/**
 * Delete one service photo. If it was the cover, the next photo in order is
 * promoted, and services.image follows - a service is never left pointing at a
 * file that no longer exists.
 */
async function deleteServicePhoto(photoId) {
  const rows = await query('SELECT service_id, file_path, is_cover FROM service_photos WHERE id = ?', [photoId]);
  if (!rows.length) throw ApiError.notFound('Photo not found');
  const photo = rows[0];

  await execute('DELETE FROM service_photos WHERE id = ?', [photoId]);
  deleteFile(photo.file_path);

  if (photo.is_cover) {
    const next = await query(
      'SELECT id, file_path FROM service_photos WHERE service_id = ? ORDER BY sort_order ASC, id ASC LIMIT 1',
      [photo.service_id],
    );
    if (next.length) {
      await execute('UPDATE service_photos SET is_cover = 1 WHERE id = ?', [next[0].id]);
      await execute('UPDATE services SET image = ? WHERE id = ?', [next[0].file_path, photo.service_id]);
    } else {
      await execute('UPDATE services SET image = NULL WHERE id = ?', [photo.service_id]);
    }
  }
}

/** Delete a single gallery photo and its file. */
async function deleteGalleryPhoto(photoId) {
  const row = await query('SELECT file_path FROM gallery_photos WHERE id = ?', [photoId]);
  await execute('DELETE FROM gallery_photos WHERE id = ?', [photoId]);
  if (row.length) deleteFile(row[0].file_path);
}

/**
 * Delete one vehicle photo. If it was the cover, the next photo in order
 * is promoted so a vehicle is never left without a cover image.
 */
async function deleteVehiclePhoto(photoId) {
  const rows = await query('SELECT vehicle_id, file_path, is_cover FROM vehicle_photos WHERE id = ?', [photoId]);
  if (!rows.length) throw ApiError.notFound('Photo not found');
  const photo = rows[0];

  await execute('DELETE FROM vehicle_photos WHERE id = ?', [photoId]);
  deleteFile(photo.file_path);

  if (photo.is_cover) {
    const next = await query(
      'SELECT id FROM vehicle_photos WHERE vehicle_id = ? ORDER BY sort_order ASC, id ASC LIMIT 1',
      [photo.vehicle_id],
    );
    if (next.length) {
      await execute('UPDATE vehicle_photos SET is_cover = 1 WHERE id = ?', [next[0].id]);
    }
  }
}

/** Delete a testimonial and its photo. */
async function deleteTestimonial(id) {
  const row = await query('SELECT photo FROM testimonials WHERE id = ?', [id]);
  await execute('DELETE FROM testimonials WHERE id = ?', [id]);
  if (row.length) deleteFile(row[0].photo);
}

/** Delete a promotion and its banner. */
async function deletePromotion(id) {
  const row = await query('SELECT banner_image FROM promotions WHERE id = ?', [id]);
  await execute('DELETE FROM promotions WHERE id = ?', [id]);
  if (row.length) deleteFile(row[0].banner_image);
}

module.exports = {
  deleteVehicle,
  deleteVehiclePhoto,
  deleteCategory,
  deleteCategoryPhoto,
  deleteAlbum,
  deleteGalleryPhoto,
  deleteCity,
  deleteService,
  deleteServicePhoto,
  deleteTestimonial,
  deletePromotion,
};
