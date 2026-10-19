'use strict';

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const sharp = require('sharp');
const { ApiError } = require('./errorHandler');

const UPLOAD_ROOT = path.join(__dirname, '..', 'uploads');
const FOLDERS = [
  'vehicles', 'categories', 'gallery', 'services', 'cities',
  'testimonials', 'promotions', 'content',
];
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

for (const folder of FOLDERS) {
  fs.mkdirSync(path.join(UPLOAD_ROOT, folder), { recursive: true });
}

/** Multer keeps the file in memory so sharp can compress before anything hits disk. */
const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES },
  fileFilter(req, file, cb) {
    if (!ALLOWED.has(file.mimetype)) {
      return cb(ApiError.badRequest('Only JPG, PNG, WebP or AVIF images are allowed.', 'bad_file_type'));
    }
    return cb(null, true);
  },
});

function randomName() {
  return `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
}

/** Today as YYYY-MM-DD, in local time - the date the file was uploaded. */
function today() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Turn an uploaded file's name into something safe for a URL: lower case,
 * spaces and punctuation to single dashes, accents stripped.
 */
function slugName(originalName) {
  const base = String(originalName || '')
    .replace(/\.[^.]+$/, '') // drop the extension; everything is stored as .webp
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

  return base || 'image';
}

/**
 * "<uploaded name>-<date>.webp", with "-2", "-3" ... appended only if that
 * exact name is already taken, so two files uploaded on one day never collide.
 */
function uniqueName(folder, originalName) {
  const stem = `${slugName(originalName)}-${today()}`;
  let candidate = `${stem}.webp`;
  let n = 2;

  while (fs.existsSync(path.join(UPLOAD_ROOT, folder, candidate))) {
    candidate = `${stem}-${n}.webp`;
    n += 1;
  }

  return candidate;
}

/**
 * Resize + compress a buffer to WebP and write it into uploads/<folder>.
 * Returns the path relative to the uploads root, e.g. "vehicles/1712-ab12cd.webp",
 * which is what gets stored in the database.
 */
async function saveImage(buffer, folder, { width = 1600, quality = 82, name } = {}) {
  if (!FOLDERS.includes(folder)) {
    throw ApiError.badRequest(`Unknown upload folder: ${folder}`, 'bad_folder');
  }

  // Named after the file that was uploaded plus the date, so the uploads folder
  // can be read by a human. Without a name to work from, fall back to random.
  const filename = name ? uniqueName(folder, name) : `${randomName()}.webp`;
  const absolute = path.join(UPLOAD_ROOT, folder, filename);

  await sharp(buffer)
    .rotate() // honour EXIF orientation
    .resize({ width, withoutEnlargement: true })
    .webp({ quality })
    .toFile(absolute);

  return `${folder}/${filename}`;
}

/** Delete a stored file. Never throws - a missing file is not an error worth failing a request over. */
function deleteFile(relativePath) {
  if (!relativePath) return;
  const safe = String(relativePath).replace(/^\/+/, '');
  // Keep deletes inside the uploads root even if a bad value reaches here.
  const absolute = path.resolve(UPLOAD_ROOT, safe);
  if (!absolute.startsWith(path.resolve(UPLOAD_ROOT))) return;
  fs.promises.unlink(absolute).catch(() => {});
}

module.exports = {
  UPLOAD_ROOT,
  memoryUpload,
  saveImage,
  deleteFile,
  single: memoryUpload.single('image'),
  many: memoryUpload.array('images', 20),
};
