'use strict';

module.exports = function errorHandler(err, req, res, _next) {
  const statusCode = Number(err.statusCode || 500);
  const code = err.code || 'INTERNAL_ERROR';
  const isTestEnv = process.env.NODE_ENV === 'test';
  const shouldLog =
    !isTestEnv && process.env.NODE_ENV !== 'production';

  if (shouldLog) {
    console.error('[pricingservice:error]', {
      requestId: req.context?.requestId || null,
      message: err.message || 'Internal server error',
      code,
      details: err.details || null,
      stack: err.stack || null,
    });
  }

  return res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error',
    code,
    details: err.details || null,
    requestId: req.context?.requestId || null,
  });
};