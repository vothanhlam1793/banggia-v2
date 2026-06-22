export function ok(res, data = null, status = 200) {
  return res.status(status).json({ ok: true, data });
}

export function error(res, message, status = 500) {
  return res.status(status).json({ ok: false, error: message });
}

export function paginated(res, { items, total, page, limit }) {
  return res.json({
    ok: true,
    data: items,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });
}
