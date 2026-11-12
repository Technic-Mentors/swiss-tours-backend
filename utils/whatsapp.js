'use strict';

const settings = require('./settings');
const { normalizeWhatsAppNumber } = require('./phone');

/**
 * Fill {vehicle} {city} {service} {page_url} placeholders in a message template.
 * Unknown placeholders are left alone rather than blanked, so a typo in the
 * admin template is visible instead of silently producing an empty message.
 */
function fillTemplate(template, vars = {}) {
  return String(template || '').replace(/\{(\w+)\}/g, (match, key) => {
    const value = vars[key];
    return value === undefined || value === null || value === '' ? match : String(value);
  });
}

/** Build a full wa.me link from a number and an already-filled message. */
function waLink(number, message) {
  const digits = normalizeWhatsAppNumber(number);
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

/**
 * Build the WhatsApp message for a given context, using the vehicle's own
 * template when it has one and falling back to the global admin templates.
 */
async function buildMessage({ vehicle = null, city = '', service = '', pageUrl = '' } = {}) {
  const [vehicleTemplate, generalTemplate] = await Promise.all([
    settings.get('whatsapp_template_vehicle', "Hello, I'd like to book the {vehicle}.\nPickup: \nDate: \nPassengers: "),
    settings.get('whatsapp_template_general', "Hello, I'd like to enquire about a chauffeur service."),
  ]);

  const template = vehicle
    ? (vehicle.whatsapp_template && vehicle.whatsapp_template.trim()) || vehicleTemplate
    : generalTemplate;

  return fillTemplate(template, {
    vehicle: vehicle ? vehicle.name : '',
    city,
    service,
    page_url: pageUrl,
  });
}

module.exports = { fillTemplate, waLink, buildMessage, normalizeWhatsAppNumber };
