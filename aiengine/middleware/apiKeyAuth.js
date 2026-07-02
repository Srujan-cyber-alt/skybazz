// middleware/apiKeyAuth.js

// Simple API key auth middleware with a static key.
// This avoids any .env / process.env issues for now.
const STATIC_API_KEY = 'super-secret-dev-key';

export function apiKeyAuth(req, res, next) {
  const providedKey = req.header('x-api-key');

  if (!providedKey) {
    return res.status(401).json({ error: 'Missing x-api-key header' });
  }

  if (providedKey !== STATIC_API_KEY) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  next();
}