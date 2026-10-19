'use strict';

const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const env = require('./config/env');
const { testConnection } = require('./config/db');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { UPLOAD_ROOT } = require('./middleware/upload');

const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');
const sitemapRoutes = require('./routes/public/sitemap');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

/**
 * CORS. The frontend calls this API directly on a different port -
 * there is no Vite proxy - so the browser needs these headers.
 * No cookies are used anywhere, so credentials stay off.
 */
const LOCALHOST = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser clients (curl, server-side prerender) which send no Origin.
      if (!origin) return callback(null, true);

      const clean = origin.replace(/\/$/, '');
      if (env.corsOrigins.includes(clean)) return callback(null, true);

      // Outside production, accept any localhost port. The prerender step
      // serves the built site on its own port, and blocking it there would
      // make every prerendered page render an error state instead of content.
      if (env.nodeEnv !== 'production' && LOCALHOST.test(clean)) return callback(null, true);

      return callback(new Error(`Origin not allowed by CORS: ${origin}`));
    },
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

if (env.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

// Uploaded images, served statically and cached hard (filenames are unique).
app.use(
  '/uploads',
  express.static(UPLOAD_ROOT, {
    maxAge: '30d',
    immutable: true,
    fallthrough: true,
  }),
);

app.get('/health', async (req, res) => {
  try {
    await testConnection();
    res.json({ ok: true, service: 'swiss-tour-transfer-api', database: 'up' });
  } catch (err) {
    res.status(503).json({ ok: false, database: 'down', message: err.message });
  }
});

// sitemap.xml and robots.txt live at the root, not under /api
app.use('/', sitemapRoutes);

app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

async function start() {
  try {
    await testConnection();
    console.log(`[db] connected to ${env.db.database} at ${env.db.host}:${env.db.port}`);
  } catch (err) {
    console.error(`[db] CONNECTION FAILED: ${err.message}`);
    console.error('[db] Is MySQL running? Have you run db/schema.sql and db/seed.sql?');
  }

  app.listen(env.port, () => {
    console.log(`[api] Swiss Tour & Transfer API listening on http://localhost:${env.port}`);
    console.log(`[api] CORS allows: ${env.corsOrigins.join(', ')}`);
  });
}

if (require.main === module) {
  start();
}

module.exports = app;
