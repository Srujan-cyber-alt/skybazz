// controllers/requestDeleteController.js
import { pool } from '../db.js';

// Internal helper: check if a request exists by request_id
async function findRequestById(requestId) {
  const [rows] = await pool.execute(
    `SELECT
       rr.id,
       rr.request_id,
       rr.status
     FROM request_requirements rr
     WHERE rr.request_id = ?
     LIMIT 1`,
    [requestId]
  );

  if (rows.length === 0) {
    return null;
  }

  return rows[0];
}

// DELETE /api/requests/:id  (soft delete: mark closed)
export async function deleteRequest(req, res) {
  const requestId = Number(req.params.id);

  if (!requestId || Number.isNaN(requestId)) {
    return res.status(400).json({ error: 'Invalid request id' });
  }

  try {
    // Ensure the request exists
    const existing = await findRequestById(requestId);
    if (!existing) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Soft delete: mark status closed and set closed_at
    const now = new Date();

    await pool.execute(
      `UPDATE request_requirements
       SET status = 'closed',
           closed_at = ?
       WHERE request_id = ?`,
      [now, requestId]
    );

    // Return minimal confirmation
    return res.json({
      requestId,
      status: 'closed',
      closedAt: now,
    });
  } catch (err) {
    console.error('Error deleting (closing) request', err);
    return res.status(500).json({ error: 'Failed to delete request' });
  }
}