import { pool } from '../db.js';

export async function insertRequest({ buyerId, rawDescription }) {
  const [result] = await pool.execute(
    `INSERT INTO requests (buyer_id, raw_description, status)
     VALUES (?, ?, 'pending_enrichment')`,
    [buyerId, rawDescription]
  );
  return result.insertId;
}

export async function markRequestEnriched(requestId) {
  await pool.execute(
    `UPDATE requests
     SET status = 'enriched'
     WHERE id = ?`,
    [requestId]
  );
}

export async function markRequestFailed(requestId) {
  await pool.execute(
    `UPDATE requests
     SET status = 'failed'
     WHERE id = ?`,
    [requestId]
  );
}

export async function insertRequirements(requestId, r) {
  const specsJson = r.specs ? JSON.stringify(r.specs) : null;

  await pool.execute(
    `INSERT INTO request_requirements
     (request_id, title, category, specs_json, quantity, budget_min, budget_max, currency,
      destination_country, urgency, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      requestId,
      r.title || 'Unknown product',
      r.category || null,
      specsJson,
      r.quantity ?? null,
      r.budget_min ?? null,
      r.budget_max ?? null,
      r.currency || null,
      r.destination_country || null,
      r.urgency || null,
      r.notes || null,
    ]
  );
}