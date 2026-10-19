'use strict';

const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { ApiError } = require('./errorHandler');

/**
 * Admin auth. No cookies anywhere: the frontend keeps the JWT in
 * sessionStorage and sends it as `Authorization: Bearer <token>`.
 * Any 401 from here makes the frontend clear the token and show the login screen.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (!token || scheme.toLowerCase() !== 'bearer') {
    return next(ApiError.unauthorized('Missing bearer token', 'no_token'));
  }

  try {
    const payload = jwt.verify(token, env.jwt.secret);
    req.admin = { id: payload.sub, email: payload.email, name: payload.name, role: payload.role };
    return next();
  } catch (err) {
    const expired = err.name === 'TokenExpiredError';
    return next(
      ApiError.unauthorized(
        expired ? 'Your session has expired. Please sign in again.' : 'Invalid token',
        expired ? 'token_expired' : 'bad_token',
      ),
    );
  }
}

function signToken(admin) {
  return jwt.sign(
    { sub: admin.id, email: admin.email, name: admin.name, role: admin.role },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn },
  );
}

module.exports = { requireAuth, signToken };
