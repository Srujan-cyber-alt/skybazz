// controllers/requestListController.js
import { pool } from '../db.js';

// Same actions mapping so list and summary stay consistent
function computeActions(status) {
  switch (status) {
    case 'open':
      return {
        canQuote: true,
        canClose: false,
        canReopen: false,
      };
    case 'quoted':
      return {
        canQuote: false,
        canClose: true,
        canReopen: false,
      };
    case 'closed':
      return {
        canQuote: false,
        canClose: false,
        canReopen: true,
      };
    default:
      return {
        canQuote: false,
        canClose: false,
        canReopen: false,
      };
  }
}

function parseNumber(value, defaultValue) {
  if (value === undefined || value === null) return defaultValue;
  const n = Number(value);
  return Number.isNaN(n) ? defaultValue : n;
}

// GET /api/requests?destination=&urgency=&status=&page=&limit=
export async function listRequests(req, res) {
  const destination = req.query.destination || null;
  const urgency = req.query.urgency || null;
  const status = req.query.status || null;

  const page = parseNumber(req.query.page, 1);
  const limit = parseNumber(req.query.limit, 10);

  const safePage = page && page > 0 ? page : 1;
  const safeLimit = limit && limit > 0 ? limit : 10;
  const offset = (safePage - 1) * safeLimit;

  try {
    const whereClauses = [];
    const params = [];

    if (destination) {
      whereClauses.push('rr.destination_country = ?');
      params.push(destination);
    }

    if (urgency) {
      whereClauses.push('rr.urgency = ?');
      params.push(urgency);
    }

    if (status) {
      whereClauses.push('rr.status = ?');
      params.push(status);
    }

    const whereSql = whereClauses.length > 0
      ? `WHERE ${whereClauses.join(' AND ')}`
      : '';

    // Count total matching requests
    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total
       FROM request_requirements rr
       ${whereSql}`,
      params
    );

    const total = countRows[0]?.total ?? 0;

    // Fetch the current page
    const selectSql = `
      SELECT
        rr.id,
        rr.request_id,
        rr.title,
        rr.category,
        rr.quantity,
        rr.currency,
        rr.destination_country,
        rr.urgency,
        rr.status,
        rr.created_at,
        rr.updated_at,
        rr.quoted_at,
        rr.closed_at
      FROM request_requirements rr
      ${whereSql}
      ORDER BY rr.id DESC
      LIMIT ${safeLimit} OFFSET ${offset}
    `;

    const [rows] = await pool.execute(selectSql, params);

    const items = rows.map(row => ({
      id: row.id,
      requestId: row.request_id,
      title: row.title,
      category: row.category,
      quantity: row.quantity,
      currency: row.currency,
      destinationCountry: row.destination_country,
      urgency: row.urgency,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      quotedAt: row.quoted_at,
      closedAt: row.closed_at,
      actions: computeActions(row.status),
    }));

    res.json({
      meta: {
        total,
        page: safePage,
        limit: safeLimit,
        pages: Math.ceil(total / safeLimit) || 1,
        filters: {
          destination,
          urgency,
          status,
        },
      },
      requests: items,
    });
  } catch (err) {
    console.error('Error listing requests', err);
    res.status(500).json({ error: 'Failed to list requests' });
  }
}