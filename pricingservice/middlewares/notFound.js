'use strict';

module.exports = function notFound(req, res) {
  return res.status(404).json({
    success: false,
    message: 'Route not found',
    code: 'ROUTE_NOT_FOUND',
    path: req.originalUrl,
    requestId: req.context?.requestId || null,
  });
};