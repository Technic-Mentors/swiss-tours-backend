'use strict';

require('dotenv').config();

function required(key, fallback) {
  const value = process.env[key] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

const env = {
  port: Number(process.env.PORT || 3010),
  nodeEnv: process.env.NODE_ENV || 'development',

  publicUrl: (process.env.PUBLIC_URL || 'http://localhost:3010').replace(/\/$/, ''),
  siteUrl: (process.env.SITE_URL || 'http://localhost:5173').replace(/\/$/, ''),

  // Comma separated list of allowed frontend origins.
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean),

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD ?? 'root1234',
    database: process.env.DB_NAME || 'swiss_tour_transfer',
  },

  jwt: {
    secret: required('JWT_SECRET', 'dev-only-insecure-secret-change-me'),
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  },

  // Email notifications (optional). Two values, both from Google:
  // the Gmail address and an App Password. Leave empty to turn email off.
  gmail: {
    user: process.env.GMAIL_USER || '',
    pass: process.env.GMAIL_APP_PASSWORD || '',
  },
};

if (env.nodeEnv === 'production' && env.jwt.secret.includes('change')) {
  // Loud but non-fatal: the app still boots so a misconfigured deploy is visible.
  console.warn('[env] WARNING: JWT_SECRET still looks like the default value.');
}

module.exports = env;
