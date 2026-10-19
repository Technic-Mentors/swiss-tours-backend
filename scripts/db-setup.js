/**
 * Convenience runner for db/schema.sql + db/seed.sql and additive migrations.
 *
 * The same two files can be opened and run in MySQL Workbench - this script
 * just saves a round trip while developing.
 *
 *   node scripts/db-setup.js          # schema + seed  (DROPS and recreates the DB)
 *   node scripts/db-setup.js --seed   # seed only
 *   node scripts/db-setup.js --migrate # apply additive migrations; keeps existing data
 */
'use strict';

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const env = require('../config/env');

const seedOnly = process.argv.includes('--seed');
const migrateOnly = process.argv.includes('--migrate');

async function runFile(conn, file) {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'db', file), 'utf8');
  await conn.query(sql);
  console.log(`  ran ${file}`);
}

(async () => {
  const conn = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    multipleStatements: true,
  });

  try {
    if (migrateOnly) {
      await conn.query(`USE \`${env.db.database}\``);
      console.log('Applying additive migrations (existing data is preserved)...');
      await runFile(conn, path.join('migrations', '001_activity_logs.sql'));
      return;
    }

    if (!seedOnly) {
      console.log('Applying schema (this drops and recreates the database)...');
      await runFile(conn, 'schema.sql');
    }

    console.log('Seeding...');
    await conn.query(`USE \`${env.db.database}\``);
    await runFile(conn, 'seed.sql');

    const [[counts]] = await conn.query(`
      SELECT
        (SELECT COUNT(*) FROM admin_users)        AS admins,
        (SELECT COUNT(*) FROM vehicles)           AS vehicles,
        (SELECT COUNT(*) FROM vehicle_categories) AS categories,
        (SELECT COUNT(*) FROM services)           AS services,
        (SELECT COUNT(*) FROM cities)              AS cities,
        (SELECT COUNT(*) FROM homepage_sections)   AS sections,
        (SELECT COUNT(*) FROM content_blocks)      AS blocks,
        (SELECT COUNT(*) FROM testimonials)        AS testimonials,
        (SELECT COUNT(*) FROM faqs)                AS faqs,
        (SELECT COUNT(*) FROM settings)            AS settings
    `);
    console.log('\nDone. Row counts:');
    console.table(counts);
  } finally {
    await conn.end();
  }
})().catch((err) => {
  console.error('\nDatabase setup failed:\n', err.sqlMessage || err.message);
  process.exit(1);
});
