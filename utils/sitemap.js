'use strict';

const { query } = require('../config/db');
const env = require('../config/env');

const STATIC_ROUTES = [
  { path: '/', priority: '1.0', changefreq: 'weekly' },
  { path: '/vehicles', priority: '0.9', changefreq: 'weekly' },
  { path: '/services', priority: '0.9', changefreq: 'monthly' },
  { path: '/about', priority: '0.6', changefreq: 'yearly' },
  { path: '/gallery', priority: '0.6', changefreq: 'monthly' },
  { path: '/reviews', priority: '0.6', changefreq: 'monthly' },
  { path: '/contact', priority: '0.7', changefreq: 'yearly' },
  { path: '/book', priority: '0.9', changefreq: 'monthly' },
  { path: '/offers', priority: '0.7', changefreq: 'weekly' },
  { path: '/privacy', priority: '0.2', changefreq: 'yearly' },
  { path: '/terms', priority: '0.2', changefreq: 'yearly' },
  { path: '/impressum', priority: '0.2', changefreq: 'yearly' },
];

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function isoDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

/** Every public URL, pulled from the database. */
async function collectRoutes() {
  const [vehicles, categories, services, cities] = await Promise.all([
    query('SELECT slug, updated_at FROM vehicles WHERE is_visible = 1 ORDER BY sort_order, id'),
    query('SELECT slug, updated_at FROM vehicle_categories WHERE is_visible = 1 ORDER BY sort_order, id'),
    query('SELECT slug, updated_at FROM services WHERE is_visible = 1 ORDER BY sort_order, id'),
    query('SELECT slug, updated_at FROM cities WHERE is_visible = 1 ORDER BY sort_order, id'),
  ]);

  return [
    ...STATIC_ROUTES.map((r) => ({ ...r, lastmod: null })),
    ...categories.map((c) => ({
      path: `/vehicles/category/${c.slug}`,
      priority: '0.7',
      changefreq: 'monthly',
      lastmod: isoDate(c.updated_at),
    })),
    ...vehicles.map((v) => ({
      path: `/vehicles/${v.slug}`,
      priority: '0.8',
      changefreq: 'monthly',
      lastmod: isoDate(v.updated_at),
    })),
    ...services.map((s) => ({
      path: `/services/${s.slug}`,
      priority: '0.8',
      changefreq: 'monthly',
      lastmod: isoDate(s.updated_at),
    })),
    ...cities.map((c) => ({
      path: `/chauffeur-service/${c.slug}`,
      priority: '0.8',
      changefreq: 'monthly',
      lastmod: isoDate(c.updated_at),
    })),
  ];
}

async function buildSitemap() {
  const routes = await collectRoutes();
  const base = env.siteUrl;

  const urls = routes
    .map((r) => {
      const loc = escapeXml(`${base}${r.path === '/' ? '' : r.path}`) || base;
      const lastmod = r.lastmod ? `\n    <lastmod>${r.lastmod}</lastmod>` : '';
      return (
        `  <url>\n` +
        `    <loc>${loc || base}</loc>${lastmod}\n` +
        `    <changefreq>${r.changefreq}</changefreq>\n` +
        `    <priority>${r.priority}</priority>\n` +
        `  </url>`
      );
    })
    .join('\n');

  const ns = 'http://www.sitemaps.org/schemas/sitemap/0.9';
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="${ns}">\n${urls}\n</urlset>\n`;
}

function buildRobots() {
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /admin/',
    '',
    `Sitemap: ${env.publicUrl}/sitemap.xml`,
    '',
  ].join('\n');
}

module.exports = { collectRoutes, buildSitemap, buildRobots };
