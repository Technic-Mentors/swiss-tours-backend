'use strict';

const { execute, queryOne } = require('../../config/db');
const { ApiError } = require('../../middleware/errorHandler');
const v = require('../../middleware/validate');
const settings = require('../../utils/settings');
const mailer = require('../../utils/mailer');
const { logActivity } = require('../../utils/activityLog');
const { buildMessage, waLink } = require('../../utils/whatsapp');
const { normalizeWhatsAppNumber } = require('../../utils/phone');

function optionalBoundedInteger(value, label, min, max) {
  const raw = v.str(value);
  if (!raw) return null;
  if (!/^\d+$/.test(raw)) {
    throw ApiError.badRequest(`${label} must be a whole number from ${min} to ${max}.`, 'bad_number');
  }
  const number = Number(raw);
  if (!Number.isSafeInteger(number) || number < min || number > max) {
    throw ApiError.badRequest(`${label} must be a whole number from ${min} to ${max}.`, 'bad_number');
  }
  return number;
}

function validatedTravelDatetime(value) {
  const raw = v.str(value);
  if (!raw) return null;
  const parts = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(raw);
  if (!parts) {
    throw ApiError.badRequest('Enter a valid travel date and time.', 'bad_datetime');
  }

  const [, yearText, monthText, dayText, hourText, minuteText, secondText = '0'] = parts;
  const [year, month, day, hour, minute, second] = [
    yearText,
    monthText,
    dayText,
    hourText,
    minuteText,
    secondText,
  ].map(Number);
  const date = new Date(year, month - 1, day, hour, minute, second);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute ||
    date.getSeconds() !== second
  ) {
    throw ApiError.badRequest('Enter a valid travel date and time.', 'bad_datetime');
  }
  if (date.getTime() <= Date.now()) {
    throw ApiError.badRequest('Travel date and time must be in the future.', 'past_datetime');
  }
  return v.datetime(raw);
}

/**
 * POST /api/enquiries
 * Saves the enquiry and hands back a prefilled WhatsApp link, so the form
 * can offer "send this on WhatsApp instead" without a second round trip.
 */
async function create(req, res) {
  const body = req.body || {};

  v.requireFields(body, ['full_name', 'phone', 'pickup', 'dropoff']);

  const fullName = v.str(body.full_name);
  if (fullName.length > 160) {
    throw ApiError.badRequest('Name must be 160 characters or fewer.', 'bad_full_name');
  }
  const phone = normalizeWhatsAppNumber(body.phone);
  if (!/^\d{7,15}$/.test(phone)) {
    throw ApiError.badRequest('Phone number must contain 7 to 15 digits.', 'bad_phone');
  }
  const pickup = v.str(body.pickup);
  const dropoff = v.str(body.dropoff);
  if (pickup.length > 255) {
    throw ApiError.badRequest('Pickup must be 255 characters or fewer.', 'bad_pickup');
  }
  if (dropoff.length > 255) {
    throw ApiError.badRequest('Drop-off must be 255 characters or fewer.', 'bad_dropoff');
  }

  const email = v.str(body.email);
  if (email.length > 190) {
    throw ApiError.badRequest('Email must be 190 characters or fewer.', 'bad_email');
  }

  if (body.email && !v.isEmail(body.email)) {
    throw ApiError.badRequest('That email address does not look right.', 'bad_email');
  }

  const travelDatetime = validatedTravelDatetime(body.travel_datetime);
  const passengers = optionalBoundedInteger(body.passengers, 'Passengers', 1, 60);
  const suitcases = optionalBoundedInteger(body.suitcases, 'Suitcases', 0, 60);

  if (v.str(body.flight_number).length > 40) {
    throw ApiError.badRequest('Flight number must be 40 characters or fewer.', 'bad_flight_number');
  }

  // Resolve the vehicle so the stored name is trustworthy rather than client-supplied.
  let vehicleId = v.int(body.vehicle_id);
  let vehicleName = v.nullable(body.vehicle_name);

  if (vehicleId) {
    const vehicle = await queryOne('SELECT id, name FROM vehicles WHERE id = ? LIMIT 1', [vehicleId]);
    if (vehicle) {
      vehicleName = vehicle.name;
    } else {
      vehicleId = null;
    }
  }

  const record = {
    service_type: v.nullable(body.service_type),
    vehicle_id: vehicleId,
    vehicle_name: vehicleName,
    pickup: v.nullable(body.pickup),
    dropoff: v.nullable(body.dropoff),
    travel_datetime: travelDatetime,
    flight_number: v.nullable(body.flight_number),
    passengers,
    suitcases,
    return_trip: v.bool(body.return_trip),
    full_name: fullName,
    email: v.nullable(body.email),
    phone,
    message: v.nullable(body.message),
    source_page: v.nullable(body.source_page),
  };

  const result = await execute(
    `INSERT INTO enquiries
       (service_type, vehicle_id, vehicle_name, pickup, dropoff, travel_datetime,
        flight_number, passengers, suitcases, return_trip,
        full_name, email, phone, message, source_page)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      record.service_type,
      record.vehicle_id,
      record.vehicle_name,
      record.pickup,
      record.dropoff,
      record.travel_datetime,
      record.flight_number,
      record.passengers,
      record.suitcases,
      record.return_trip,
      record.full_name,
      record.email,
      record.phone,
      record.message,
      record.source_page,
    ],
  );

  await logActivity({
    entityType: 'enquiry',
    entityId: result.insertId,
    action: 'received',
    meta: `${record.full_name} · ${record.phone}`,
    req,
  });

  // Build the equivalent WhatsApp message from what they just typed.
  const number = await settings.whatsappNumber();
  const parts = [
    record.vehicle_name
      ? `Hello, I would like to book the ${record.vehicle_name}.`
      : 'Hello, I would like to enquire about a chauffeur service.',
    record.service_type ? `Service: ${record.service_type}` : null,
    record.pickup ? `Pickup: ${record.pickup}` : null,
    record.dropoff ? `Drop-off: ${record.dropoff}` : null,
    record.travel_datetime ? `Date: ${record.travel_datetime}` : null,
    record.passengers ? `Passengers: ${record.passengers}` : null,
    record.suitcases ? `Suitcases: ${record.suitcases}` : null,
    record.flight_number ? `Flight: ${record.flight_number}` : null,
    record.return_trip ? 'Return trip: yes' : null,
    `Name: ${record.full_name}`,
    `Phone: ${record.phone}`,
    record.message ? `Note: ${record.message}` : null,
  ].filter(Boolean);

  // Email the business. Deliberately not awaited: a slow or broken mail server
  // must never hold up (or fail) the guest's submission - the enquiry is
  // already safely in the database by this point.
  mailer
    .sendEnquiryNotification({ ...record, id: result.insertId })
    .catch((err) => console.error('[mail] notification failed:', err.message));

  const replyMinutes = await settings.get('reply_time_minutes', '10');

  res.status(201).json({
    id: result.insertId,
    message: `Thank you. We have received your enquiry and will reply within about ${replyMinutes} minutes.`,
    whatsappUrl: waLink(number, parts.join('\n')),
  });
}

/**
 * POST /api/whatsapp-clicks
 * Fire-and-forget analytics. Always answers 204 so a tracking failure can
 * never stop the WhatsApp window from opening.
 */
async function trackClick(req, res) {
  const body = req.body || {};

  try {
    await execute(
      'INSERT INTO whatsapp_clicks (vehicle_id, vehicle_name, page_path, page_type) VALUES (?, ?, ?, ?)',
      [
        v.int(body.vehicle_id),
        v.nullable(body.vehicle_name),
        v.nullable(body.page_path),
        v.nullable(body.page_type),
      ],
    );
  } catch (err) {
    console.warn('[whatsapp-clicks] could not record click:', err.message);
  }

  res.status(204).end();
}

/** GET /api/whatsapp-message?vehicle=&city=&service= - server-built message text. */
async function previewMessage(req, res) {
  const vehicleSlug = v.str(req.query.vehicle);
  let vehicle = null;

  if (vehicleSlug) {
    vehicle = await queryOne(
      'SELECT id, name, whatsapp_template FROM vehicles WHERE slug = ? AND is_visible = 1 LIMIT 1',
      [vehicleSlug],
    );
  }

  const message = await buildMessage({
    vehicle,
    city: v.str(req.query.city),
    service: v.str(req.query.service),
    pageUrl: v.str(req.query.page_url),
  });

  const number = await settings.whatsappNumber();
  res.json({ message, url: waLink(number, message) });
}

module.exports = { create, trackClick, previewMessage };
