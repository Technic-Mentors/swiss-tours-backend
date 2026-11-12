'use strict';

/** Normalize local Swiss and international phone formats for WhatsApp links. */
function normalizeWhatsAppNumber(value) {
  let digits = String(value ?? '').replace(/\D/g, '');
  if (digits.startsWith('00')) return digits.slice(2);
  if (digits.startsWith('0')) return `41${digits.slice(1)}`;
  return digits;
}

module.exports = { normalizeWhatsAppNumber };
