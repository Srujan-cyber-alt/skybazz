'use strict';

const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const headerUserRole = req.headers['x-user-role'];
  const headerUserId = req.headers['x-user-id'];

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({
      success: false,
      message: 'Authentication service is not configured',
      code: 'AUTH_CONFIGURATION_ERROR',
      requestId: req.context?.requestId || null,
    });
  }

  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Missing or invalid Authorization header',
      code: 'AUTH_REQUIRED',
      requestId: req.context?.requestId || null,
    });
  }

  const token = authHeader.slice(7).trim();

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Missing or invalid Authorization header',
      code: 'AUTH_REQUIRED',
      requestId: req.context?.requestId || null,
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      audience: process.env.JWT_AUDIENCE || undefined,
      issuer: process.env.JWT_ISSUER || undefined,
    });

    const resolvedRole = String(decoded.role || headerUserRole || 'BUYER').toUpperCase();

    req.user = {
      id: decoded.id || decoded.userId || headerUserId || null,
      email: decoded.email || null,
      role: resolvedRole,
      partnerId: decoded.partnerId || null,
      companyId: decoded.companyId || null,
    };

    return next();
  } catch (_error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
      code: 'INVALID_TOKEN',
      requestId: req.context?.requestId || null,
    });
  }
}

module.exports = { requireAuth };