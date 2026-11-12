'use strict';

const { ApiError } = require('../../middleware/errorHandler');
const settings = require('../../utils/settings');
const { normalizeWhatsAppNumber } = require('../../utils/phone');
const mailer = require('../../utils/mailer');
const v = require('../../middleware/validate');

/**
 * Settings the admin panel is allowed to write. Anything not on this list is
 * ignored, so a stray field in a form body cannot create junk rows.
 */
const WRITABLE = new Set([
  // WhatsApp
  'whatsapp_number',
  'whatsapp_template_vehicle',
  'whatsapp_template_general',
  'whatsapp_template_city',
  'whatsapp_template_service',
  'show_floating_whatsapp',
  'show_sticky_mobile_bar',
  // Contact
  'company_name',
  'tagline',
  'phone',
  'email',
  'notification_email',
  'address',
  'opening_hours',
  'maps_embed_url',
  'maps_link',
  // Social
  'social_instagram',
  'social_facebook',
  'social_linkedin',
  'social_tiktok',
  // Announcement bar
  'announcement_enabled',
  'announcement_text',
  'announcement_link',
  // Trust / display
  'google_rating',
  'google_review_count',
  'reply_time_minutes',
  'logo',
]);

async function get(req, res) {
  const all = await settings.loadAll(true);
  // The panel shows whether enquiry emails can actually be delivered.
  res.json({ settings: all, mail: { configured: mailer.isConfigured() } });
}

/** POST /api/admin/settings/test-email - prove the SMTP setup works. */
async function testEmail(req, res) {
  const to = v.str(req.body?.to) || (await settings.get('notification_email')) || (await settings.get('email'));

  if (!to || !v.isEmail(to)) {
    throw ApiError.badRequest('Enter the email address to send the test to.', 'bad_email');
  }

  await mailer.sendTestEmail(to);
  res.json({ message: `Test email sent to ${to}.` });
}

/** PUT /api/admin/settings - body is a flat { key: value } object. */
async function update(req, res) {
  const body = req.body?.settings ?? req.body;

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw ApiError.badRequest('Send an object of setting key/value pairs.', 'bad_settings');
  }

  const accepted = {};
  const ignored = [];

  for (const [key, value] of Object.entries(body)) {
    if (WRITABLE.has(key)) accepted[key] = value;
    else ignored.push(key);
  }

  if (!Object.keys(accepted).length) {
    throw ApiError.badRequest('None of those settings can be changed here.', 'no_writable_settings');
  }

  // A WhatsApp number with punctuation still has to produce a valid wa.me link.
  if (accepted.whatsapp_number !== undefined) {
    const digits = normalizeWhatsAppNumber(accepted.whatsapp_number);
    if (digits.length < 8) {
      throw ApiError.badRequest(
        'Enter the WhatsApp number in international format, for example +41 79 123 45 67.',
        'bad_whatsapp_number',
      );
    }
    accepted.whatsapp_number = digits;
  }

  await settings.setMany(accepted);
  const all = await settings.loadAll(true);

  res.json({
    message: 'Settings saved.',
    saved: Object.keys(accepted).length,
    ignored,
    settings: all,
  });
}

module.exports = { get, update, testEmail, WRITABLE };
