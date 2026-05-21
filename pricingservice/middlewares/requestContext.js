'use strict';

function requestContext(req, res, next) {
  const requestId =
    req.headers['x-request-id'] ||
    `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

  req.context = {
    requestId,
    service: process.env.PRICING_SERVICE_NAME || 'pricingservice',
    receivedAt: new Date().toISOString(),
    clientService: req.headers['x-client-service'] || null,
  };

  res.setHeader('x-request-id', requestId);
  next();
}

module.exports = requestContext;