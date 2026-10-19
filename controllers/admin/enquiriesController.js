'use strict';

const { query, execute } = require('../../config/db');
const { ApiError } = require('../../middleware/errorHandler');
const v = require('../../middleware/validate');
const crud = require('../../utils/crud');
const { dateRange } = require('../../utils/paginate');
const { logActivity } = require('../../utils/activityLog');
const STATUSES = ['new', 'contacted', 'confirmed', 'closed'];

/** GET /api/admin/enquiries?status=&q=&page=&per_page= */
async function list(req, res) {
  const status = v.str(req.query.status);
  const q = v.str(req.query.q);
  const page = Math.max(v.int(req.query.page) || 1, 1);
  const perPage = Math.min(Math.max(v.int(req.query.per_page) || 25, 5), 100);
  const offset = (page - 1) * perPage;

  const where = ['1 = 1'];
  const params = [];

  if (STATUSES.includes(status)) {
    where.push('status = ?');
    params.push(status);
  }
  if (q) {
    where.push('(full_name LIKE ? OR phone LIKE ? OR email LIKE ? OR vehicle_name LIKE ? OR pickup LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like, like, like, like);
  }

  // Filter on when the enquiry arrived, or on the travel date itself.
  const field = v.str(req.query.date_field) === 'travel' ? 'travel_datetime' : 'created_at';
  const range = dateRange(field, req.query.date_from, req.query.date_to);
  where.push(...range.where);
  params.push(...range.params);

  const whereSql = where.join(' AND ');

  const [rows, [{ total }], counts] = await Promise.all([
    query(
      `SELECT * FROM enquiries WHERE ${whereSql} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
      [...params, perPage, offset],
    ),
    query(`SELECT COUNT(*) AS total FROM enquiries WHERE ${whereSql}`, params),
    query('SELECT status, COUNT(*) AS total FROM enquiries GROUP BY status'),
  ]);

  const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  for (const row of counts) byStatus[row.status] = Number(row.total);

  res.json({
    enquiries: rows,
    pagination: {
      page,
      perPage,
      total: Number(total),
      pages: Math.max(Math.ceil(Number(total) / perPage), 1),
    },
    counts: byStatus,
  });
}

async function detail(req, res) {
  const id = v.requireId(req.params.id);
  const enquiry = await crud.findOrFail('enquiries', id, 'Enquiry');
  res.json({ enquiry });
}

/** PATCH /api/admin/enquiries/:id/status */
async function setStatus(req, res) {
  const id = v.requireId(req.params.id);
  const status = v.str(req.body?.status);

  if (!STATUSES.includes(status)) {
    throw ApiError.badRequest(`Status must be one of: ${STATUSES.join(', ')}`, 'bad_status');
  }

  const enquiry = await crud.findOrFail('enquiries', id, 'Enquiry');

  // same status pe kuch na karo, warna log spam hoga
  if (enquiry.status === status) {
    return res.json({ id, status });
  }

  await execute('UPDATE enquiries SET status = ? WHERE id = ?', [status, id]);

  await logActivity({
    entityType: 'enquiry',
    entityId: id,
    action: 'status_changed',
    field: 'status',
    oldValue: enquiry.status,
    newValue: status,
    req,
  });

  res.json({ id, status });
}

async function remove(req, res) {
  const id = v.requireId(req.params.id);
  const enquiry = await crud.findOrFail('enquiries', id, 'Enquiry');

  await execute('DELETE FROM enquiries WHERE id = ?', [id]);

  await logActivity({
    entityType: 'enquiry',
    entityId: id,
    action: 'deleted',
    meta: `${enquiry.full_name} · ${enquiry.phone} · ${enquiry.service_type || ''}`.trim(),
    req,
  });

  res.json({ message: 'Enquiry deleted.' });
}
/* ------------------------------------------------- whatsapp_contacted */
async function logWhatsApp(req, res) {
  const id = v.requireId(req.params.id);
  const enquiry = await crud.findOrFail('enquiries', id, 'Enquiry');

  const message = v.str(req.body?.message) || null;

  await logActivity({
    entityType: 'enquiry',
    entityId: id,
    action: 'whatsapp_contacted',
    meta: message ? message.slice(0, 500) : `wa.me/${enquiry.phone}`,
    req,
  });

  // agar status 'new' hai to auto 'contacted'
  if (enquiry.status === 'new') {
    await execute('UPDATE enquiries SET status = ? WHERE id = ?', ['contacted', id]);

    await logActivity({
      entityType: 'enquiry',
      entityId: id,
      action: 'status_changed',
      field: 'status',
      oldValue: 'new',
      newValue: 'contacted',
      meta: 'auto (after WhatsApp contact)',
      req,
    });

    return res.json({ ok: true, status: 'contacted' });
  }

  res.json({ ok: true });
}
/* -------------------------------------------------------- getActivity */
async function getActivity(req, res) {
  const id = v.requireId(req.params.id);
  await crud.findOrFail('enquiries', id, 'Enquiry');

  const rows = await query(
    `SELECT id, action, field, old_value, new_value, meta,
            actor_id, actor_name, actor_email, ip_address, created_at
       FROM activity_logs
      WHERE entity_type = 'enquiry' AND entity_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT 200`,
    [id],
  );

  res.json({ activity: rows });
}
module.exports = { list, detail, setStatus, remove, logWhatsApp, getActivity, STATUSES };
