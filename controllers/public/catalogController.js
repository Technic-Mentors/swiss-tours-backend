'use strict';

const { query } = require('../../config/db');
const { ApiError } = require('../../middleware/errorHandler');
const { str, int } = require('../../middleware/validate');
const { VEHICLE_FIELDS, shape } = require('./vehiclesController');

/** Split a textarea stored "one item per line" into an array. */
function lines(value) {
  return value ? String(value).split('\n').map((s) => s.trim()).filter(Boolean) : [];
}

/* ------------------------------------------------------------------ services */

async function listServices(req, res) {
  const homeOnly = str(req.query.homepage) === '1';

  const services = await query(
    `SELECT id, name, slug, short_description, image, icon, price_text, sort_order
       FROM services
      WHERE is_visible = 1 ${homeOnly ? 'AND show_on_homepage = 1' : ''}
      ORDER BY sort_order ASC, id ASC`,
  );

  res.json({ services });
}

async function serviceDetail(req, res) {
  const rows = await query(
    `SELECT id, name, slug, short_description, full_description, included, image, icon, price_text
       FROM services WHERE slug = ? AND is_visible = 1 LIMIT 1`,
    [str(req.params.slug)],
  );
  if (!rows.length) throw ApiError.notFound('Service not found', 'service_not_found');

  const service = { ...rows[0], included: lines(rows[0].included) };

  const [others, vehicles, photos, servicePhotos] = await Promise.all([
    query(
      `SELECT id, name, slug, short_description, image
         FROM services WHERE is_visible = 1 AND id <> ?
        ORDER BY sort_order ASC LIMIT 4`,
      [service.id],
    ),
    query(
      `SELECT ${VEHICLE_FIELDS}
         FROM vehicles v LEFT JOIN vehicle_categories c ON c.id = v.category_id
        WHERE v.is_visible = 1
        ORDER BY v.is_featured DESC, v.sort_order ASC LIMIT 3`,
    ),
    // A short gallery strip on the service page, same as the vehicle list.
    query(
      `SELECT p.id, p.file_path, p.caption, p.alt_text, a.name AS album_name, a.slug AS album_slug
         FROM gallery_photos p
         JOIN gallery_albums a ON a.id = p.album_id
        WHERE p.is_visible = 1 AND a.is_visible = 1
        ORDER BY p.sort_order ASC, p.id DESC
        LIMIT 6`,
    ),
    // The service's own photos, cover first.
    query(
      `SELECT id, file_path, alt_text, is_cover
         FROM service_photos WHERE service_id = ?
        ORDER BY is_cover DESC, sort_order ASC, id ASC`,
      [service.id],
    ),
  ]);

  res.json({
    service: { ...service, photos: servicePhotos },
    otherServices: others,
    vehicles: vehicles.map(shape),
    photos,
  });
}

/* -------------------------------------------------------------------- cities */

async function listCities(req, res) {
  const cities = await query(
    `SELECT c.id, c.name, c.slug, c.hub_label, c.intro, c.image, c.lat, c.lng,
            (SELECT COUNT(*) FROM vehicle_cities vc
               JOIN vehicles v ON v.id = vc.vehicle_id
              WHERE vc.city_id = c.id AND v.is_visible = 1) AS vehicle_count
       FROM cities c
      WHERE c.is_visible = 1
      ORDER BY c.sort_order ASC, c.id ASC`,
  );
  res.json({ cities });
}

async function cityDetail(req, res) {
  const rows = await query(
    `SELECT id, name, slug, hub_label, intro, description, image, lat, lng
       FROM cities WHERE slug = ? AND is_visible = 1 LIMIT 1`,
    [str(req.params.slug)],
  );
  if (!rows.length) throw ApiError.notFound('City not found', 'city_not_found');
  const city = rows[0];

  const [vehicles, services, otherCities] = await Promise.all([
    query(
      `SELECT ${VEHICLE_FIELDS}
         FROM vehicles v
         LEFT JOIN vehicle_categories c ON c.id = v.category_id
         JOIN vehicle_cities vc ON vc.vehicle_id = v.id
        WHERE v.is_visible = 1 AND vc.city_id = ?
        ORDER BY v.sort_order ASC`,
      [city.id],
    ),
    query(
      `SELECT id, name, slug, short_description, image
         FROM services WHERE is_visible = 1 ORDER BY sort_order ASC LIMIT 6`,
    ),
    query(
      'SELECT name, slug, hub_label FROM cities WHERE is_visible = 1 AND id <> ? ORDER BY sort_order ASC',
      [city.id],
    ),
  ]);

  res.json({ city, vehicles: vehicles.map(shape), services, otherCities });
}

/* ------------------------------------------------------------------- gallery */

async function listAlbums(req, res) {
  const albums = await query(
    `SELECT a.id, a.name, a.slug, a.sort_order,
            (SELECT COUNT(*) FROM gallery_photos p WHERE p.album_id = a.id AND p.is_visible = 1) AS photo_count
       FROM gallery_albums a
      WHERE a.is_visible = 1
      ORDER BY a.sort_order ASC, a.id ASC`,
  );
  res.json({ albums });
}

async function listPhotos(req, res) {
  const album = str(req.query.album);
  const limit = Math.min(int(req.query.limit) || 200, 200);

  const params = [];
  let filter = '';
  if (album && album !== 'all') {
    filter = 'AND a.slug = ?';
    params.push(album);
  }

  const photos = await query(
    `SELECT p.id, p.file_path, p.caption, p.alt_text, a.name AS album_name, a.slug AS album_slug
       FROM gallery_photos p
       JOIN gallery_albums a ON a.id = p.album_id
      WHERE p.is_visible = 1 AND a.is_visible = 1 ${filter}
      ORDER BY p.sort_order ASC, p.id DESC
      LIMIT ?`,
    [...params, limit],
  );

  res.json({ photos });
}

/* -------------------------------------------------------------- testimonials */

async function listTestimonials(req, res) {
  const featuredOnly = str(req.query.featured) === '1';
  const limit = Math.min(int(req.query.limit) || 50, 50);

  const rows = await query(
    `SELECT id, customer_name, country, service_label, rating, review_text, photo, source, created_at
       FROM testimonials
      WHERE is_approved = 1 ${featuredOnly ? 'AND is_featured = 1' : ''}
      ORDER BY sort_order ASC, id ASC
      LIMIT ?`,
    [limit],
  );

  const [stats] = await query(
    `SELECT COUNT(*) AS total, ROUND(AVG(rating), 1) AS average
       FROM testimonials WHERE is_approved = 1`,
  );

  res.json({
    testimonials: rows,
    stats: { total: Number(stats.total || 0), average: Number(stats.average || 0) },
  });
}

/* ---------------------------------------------------------------- promotions */

/**
 * Active promotions only. Expired offers hide themselves: the date window is
 * evaluated in SQL against CURDATE(), so nothing needs a cron job.
 */
async function activePromotions(req, res) {
  const placement = str(req.query.placement);

  const params = [];
  let filter = '';
  if (placement === 'homepage_banner' || placement === 'offers_page') {
    filter = "AND (placement = ? OR placement = 'both')";
    params.push(placement);
  }

  const promotions = await query(
    `SELECT id, title, description, code, banner_image, placement,
            starts_at, ends_at, link_type, link_url
       FROM promotions
      WHERE is_active = 1
        AND (starts_at IS NULL OR starts_at <= CURDATE())
        AND (ends_at   IS NULL OR ends_at   >= CURDATE())
        ${filter}
      ORDER BY sort_order ASC, id ASC`,
    params,
  );

  res.json({ promotions });
}

module.exports = {
  listServices,
  serviceDetail,
  listCities,
  cityDetail,
  listAlbums,
  listPhotos,
  listTestimonials,
  activePromotions,
  lines,
};
