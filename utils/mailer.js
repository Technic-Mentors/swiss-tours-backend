'use strict';

const nodemailer = require('nodemailer');
const env = require('../config/env');
const settings = require('./settings');
const { normalizeWhatsAppNumber } = require('./phone');

/**
 * Email notifications for new enquiries, over Gmail.
 *
 * Setup is two values in .env - the Gmail address and a Google App Password.
 * Everything else (host, port, TLS, the From address) is derived, because
 * Gmail only accepts one combination anyway.
 *
 * Leave GMAIL_USER empty and email is simply off: enquiries are still saved
 * and listed in the admin panel.
 */

let transporter = null;
let warned = false;

function getTransporter() {
  if (!env.gmail.user || !env.gmail.pass) return null;
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: env.gmail.user,
      // Google shows app passwords with spaces; they are not part of the secret.
      pass: env.gmail.pass.replace(/\s+/g, ''),
    },
  });

  return transporter;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDateTime(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString('en-GB');
}

/** The rows that make up the enquiry, skipping anything the guest left blank. */
function buildRows(enquiry) {
  return [
    ['Name', enquiry.full_name],
    ['Phone', enquiry.phone],
    ['Email', enquiry.email],
    ['Service', enquiry.service_type],
    ['Vehicle', enquiry.vehicle_name],
    ['Pickup', enquiry.pickup],
    ['Drop-off', enquiry.dropoff],
    ['Date & time', formatDateTime(enquiry.travel_datetime)],
    ['Flight', enquiry.flight_number],
    ['Passengers', enquiry.passengers],
    ['Suitcases', enquiry.suitcases],
    ['Return trip', enquiry.return_trip ? 'Yes' : null],
    ['Message', enquiry.message],
    ['Sent from', enquiry.source_page],
  ].filter(([, value]) => value !== null && value !== undefined && value !== '');
}

function buildHtml(enquiry, rows) {
  const cells = rows
    .map(
      ([label, value]) =>
        `<tr>
           <td style="padding:8px 14px;border-bottom:1px solid #e8e1d5;color:#6b6459;white-space:nowrap;vertical-align:top">${escapeHtml(label)}</td>
           <td style="padding:8px 14px;border-bottom:1px solid #e8e1d5;color:#16202e"><strong>${escapeHtml(value)}</strong></td>
         </tr>`,
    )
    .join('');

  const waNumber = normalizeWhatsAppNumber(enquiry.phone);

  return `<!doctype html>
<html><body style="margin:0;background:#f2efe9;font-family:-apple-system,Segoe UI,Roboto,sans-serif">
  <div style="max-width:620px;margin:0 auto;padding:28px 18px">
    <div style="background:#0a121e;border-radius:12px 12px 0 0;padding:22px 26px">
      <div style="font-size:18px;letter-spacing:.1em;color:#f5f1ea;font-weight:600">SWISS TOUR &amp; TRANSFER</div>
      <div style="font-size:11px;letter-spacing:.22em;color:#d2ad6e;margin-top:4px">NEW ENQUIRY</div>
    </div>

    <div style="background:#fff;border:1px solid #e0d9cc;border-top:0;border-radius:0 0 12px 12px;padding:8px 12px 20px">
      <table style="width:100%;border-collapse:collapse;font-size:14px">${cells}</table>

      <div style="padding:18px 14px 4px">
        <a href="https://wa.me/${waNumber}"
           style="display:inline-block;background:#25d366;color:#06301a;text-decoration:none;font-weight:700;font-size:13px;padding:11px 20px;border-radius:8px">
          Reply on WhatsApp
        </a>
        <a href="${escapeHtml(env.siteUrl)}/admin/enquiries"
           style="display:inline-block;margin-left:8px;border:1px solid #e0d9cc;color:#7a5c25;text-decoration:none;font-weight:600;font-size:13px;padding:10px 20px;border-radius:8px">
          Open admin panel
        </a>
      </div>
    </div>

    <p style="color:#8a8275;font-size:12px;text-align:center;margin-top:18px">
      Sent automatically by your website when someone submits the booking form.
    </p>
  </div>
</body></html>`;
}

/** Who the notification goes to: the admin setting, else the contact email. */
async function recipient() {
  return (await settings.get('notification_email', '')) || (await settings.get('email', ''));
}

/**
 * Notify the business about a new enquiry.
 * Never throws - a mail failure must not fail the guest's submission.
 */
async function sendEnquiryNotification(enquiry) {
  const transport = getTransporter();

  if (!transport) {
    if (!warned) {
      console.warn('[mail] GMAIL_USER / GMAIL_APP_PASSWORD not set - enquiry emails are off.');
      warned = true;
    }
    return { sent: false, reason: 'not_configured' };
  }

  try {
    const to = await recipient();
    if (!to) return { sent: false, reason: 'no_recipient' };

    const rows = buildRows(enquiry);

    await transport.sendMail({
      // Gmail rewrites From to the authenticated account, so use it directly.
      from: `Swiss Tour & Transfer <${env.gmail.user}>`,
      to,
      replyTo: enquiry.email || undefined,
      subject: `New enquiry: ${enquiry.full_name}${enquiry.vehicle_name ? ` - ${enquiry.vehicle_name}` : ''}`,
      text: rows.map(([label, value]) => `${label}: ${value}`).join('\n'),
      html: buildHtml(enquiry, rows),
    });

    return { sent: true };
  } catch (err) {
    console.error('[mail] Could not send the enquiry notification:', err.message);
    return { sent: false, reason: err.message };
  }
}

/** Used by the admin "send a test email" button. */
async function sendTestEmail(to) {
  const transport = getTransporter();
  if (!transport) {
    throw new Error('Add GMAIL_USER and GMAIL_APP_PASSWORD to Backend/.env, then restart the backend.');
  }

  await transport.sendMail({
    from: `Swiss Tour & Transfer <${env.gmail.user}>`,
    to,
    subject: 'Swiss Tour & Transfer - test email',
    text: 'This is a test from your website admin panel. Enquiry notifications are working.',
    html: '<p>This is a test from your website admin panel. Enquiry notifications are working.</p>',
  });

  return true;
}

function isConfigured() {
  return Boolean(env.gmail.user && env.gmail.pass);
}

module.exports = { sendEnquiryNotification, sendTestEmail, isConfigured };
