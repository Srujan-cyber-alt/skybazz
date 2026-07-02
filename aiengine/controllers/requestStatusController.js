// controllers/requestStatusController.js
import { pool } from '../db.js';
import { getRequestSummary } from './requestController.js';

const ALLOWED_STATUS = ['open', 'quoted', 'closed'];

// PATCH /api/requests/:id/status
export async function updateRequestStatus(req, res) {
  const requestId = Number(req.params.id);
  const { status } = req.body || {};

  if (!status || typeof status !== 'string') {
    return res.status(400).json({ error: 'status is required' });
  }

  if (!ALLOWED_STATUS.includes(status)) {
    return res.status(400).json({
      error: `status must be one of: ${ALLOWED_STATUS.join(', ')}`,
    });
  }

  try {
    // Load current status and timestamps
    const [rows] = await pool.execute(
      `SELECT id, request_id, status, quoted_at, closed_at
       FROM request_requirements
       WHERE request_id = ?
       LIMIT 1`,
      [requestId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const current = rows[0];
    const previousStatus = current.status;

    // Decide timestamp updates
    let quotedAt = current.quoted_at;
    let closedAt = current.closed_at;

    const now = new Date();

    if (status === 'open') {
      // Reopen: clear quote/close timestamps
      quotedAt = null;
      closedAt = null;
    } else if (status === 'quoted') {
      // First time quoting: set quoted_at
      if (!quotedAt) {
        quotedAt = now;
      }
      // Don't touch closed_at here
    } else if (status === 'closed') {
      // Closing: set closed_at
      if (!closedAt) {
        closedAt = now;
      }
      // quoted_at stays as whatever it was
    }

    // Update row
    await pool.execute(
      `UPDATE request_requirements
       SET status = ?,
           quoted_at = ?,
           closed_at = ?
       WHERE request_id = ?`,
      [status, quotedAt, closedAt, requestId]
    );

    // Return updated summary (includes actions, quotation, logistics)
    try {
      const fakeReq = { params: { id: String(requestId) } };
      let summaryPayload = null;

      const fakeRes = {
        json: (payload) => {
          summaryPayload = payload;
        },
        status: (code) => ({
          json: (payload) => {
            summaryPayload = { code, payload };
          },
        }),
      };

      await getRequestSummary(fakeReq, fakeRes);

      if (!summaryPayload || summaryPayload.code === 404) {
        return res.json({
          requestId,
          status,
          previousStatus,
        });
      }

      return res.json(summaryPayload);
    } catch (err) {
      console.error('Error rebuilding summary after status update', err);
      return res.json({
        requestId,
        status,
        previousStatus,
      });
    }
  } catch (err) {
    console.error('Error updating request status', err);
    res.status(500).json({ error: 'Failed to update status' });
  }
}