// controllers/healthController.js
import { pool } from '../db.js';

// GET /api/health
export async function getHealth(req, res) {
  try {
    // Simple DB check: run a lightweight query
    const [rows] = await pool.execute(
      'SELECT COUNT(*) AS total FROM request_requirements LIMIT 1'
    );

    const total = rows[0]?.total ?? 0;

    return res.json({
      status: 'ok',
      db: 'ok',
      totalRequests: total,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Health check failed', err);
    return res.status(500).json({
      status: 'error',
      db: 'error',
      timestamp: new Date().toISOString(),
    });
  }
}