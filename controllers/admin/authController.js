'use strict';

const bcrypt = require('bcrypt');
const { queryOne, execute } = require('../../config/db');
const { ApiError } = require('../../middleware/errorHandler');
const { signToken } = require('../../middleware/auth');
const v = require('../../middleware/validate');

/**
 * POST /api/admin/auth/login
 * Returns a JWT. The frontend keeps it in sessionStorage - no cookie is set here.
 */
async function login(req, res) {
  const email = v.str(req.body?.email).toLowerCase();
  const password = v.str(req.body?.password);

  if (!email || !password) {
    throw ApiError.badRequest('Enter your email and password.', 'missing_credentials');
  }

  const admin = await queryOne(
    'SELECT id, name, email, password_hash, role FROM admin_users WHERE email = ? LIMIT 1',
    [email],
  );

  // Same message either way so the form cannot be used to discover valid emails.
  const invalid = ApiError.unauthorized('Email or password is incorrect.', 'bad_credentials');
  if (!admin) throw invalid;

  const ok = await bcrypt.compare(password, admin.password_hash);
  if (!ok) throw invalid;

  await execute('UPDATE admin_users SET last_login_at = NOW() WHERE id = ?', [admin.id]);

  const token = signToken(admin);

  res.json({
    token,
    admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role },
  });
}

/** GET /api/admin/auth/me - lets the frontend confirm a stored token is still valid. */
async function me(req, res) {
  const admin = await queryOne(
    'SELECT id, name, email, role, last_login_at FROM admin_users WHERE id = ? LIMIT 1',
    [req.admin.id],
  );
  if (!admin) throw ApiError.unauthorized('This account no longer exists.', 'admin_missing');
  res.json({ admin });
}

/**
 * PUT /api/admin/auth/profile
 * Name and email only - the password has its own endpoint so a slip in this
 * form can never lock the account out.
 */
async function updateProfile(req, res) {
  const name = v.str(req.body?.name);
  const email = v.str(req.body?.email).toLowerCase();

  if (!name) throw ApiError.badRequest('Enter your name.', 'missing_name');
  if (!v.isEmail(email)) throw ApiError.badRequest('Enter a valid email address.', 'bad_email');

  // No unique constraint is relied on here; the check is explicit, like the rest
  // of the schema's relationships.
  const clash = await queryOne(
    'SELECT id FROM admin_users WHERE email = ? AND id <> ? LIMIT 1',
    [email, req.admin.id],
  );
  if (clash) throw ApiError.badRequest('Another account already uses that email.', 'email_taken');

  await execute('UPDATE admin_users SET name = ?, email = ? WHERE id = ?', [name, email, req.admin.id]);

  const admin = await queryOne(
    'SELECT id, name, email, role, last_login_at FROM admin_users WHERE id = ? LIMIT 1',
    [req.admin.id],
  );

  res.json({ admin, message: 'Profile updated.' });
}

/** POST /api/admin/auth/change-password */
async function changePassword(req, res) {
  const current = v.str(req.body?.current_password);
  const next = v.str(req.body?.new_password);

  if (!current || !next) {
    throw ApiError.badRequest('Enter your current and new password.', 'missing_fields');
  }
  if (next.length < 8) {
    throw ApiError.badRequest('The new password must be at least 8 characters.', 'password_too_short');
  }

  const admin = await queryOne('SELECT id, password_hash FROM admin_users WHERE id = ? LIMIT 1', [req.admin.id]);
  if (!admin) throw ApiError.unauthorized('This account no longer exists.', 'admin_missing');

  const ok = await bcrypt.compare(current, admin.password_hash);
  if (!ok) throw ApiError.badRequest('Your current password is incorrect.', 'bad_current_password');

  const hash = await bcrypt.hash(next, 10);
  await execute('UPDATE admin_users SET password_hash = ? WHERE id = ?', [hash, admin.id]);

  res.json({ message: 'Password updated.' });
}

module.exports = { login, me, updateProfile, changePassword };
