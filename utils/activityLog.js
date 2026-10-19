'use strict';

const { execute } = require('../config/db');

async function logActivity({
  entityType = 'enquiry',
  entityId,
  action,
  field = null,
  oldValue = null,
  newValue = null,
  meta = null,
  req = null,
}) {
  try {
    const actor = req?.admin || req?.user || null;
    const ip =
      req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
      req?.ip ||
      null;
    const ua = req?.headers?.['user-agent']?.slice(0, 255) || null;

    const trim = (v, n = 255) => {
      if (v === null || v === undefined) return null;
      const str = String(v);
      return str.length > n ? str.slice(0, n) : str;
    };

    await execute(
      `INSERT INTO activity_logs
        (entity_type, entity_id, action, field, old_value, new_value,
         meta, actor_id, actor_name, actor_email, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        trim(entityType, 60),
        entityId,
        trim(action, 60),
        trim(field, 60),
        trim(oldValue, 255),
        trim(newValue, 255),
        trim(meta, 500),
        actor?.id || null,
        trim(actor?.name, 160),
        trim(actor?.email, 190),
        trim(ip, 45),
        ua,
      ],
    );
  } catch (err) {
    console.error('[activityLog] failed:', err.message);
  }
}

module.exports = { logActivity };