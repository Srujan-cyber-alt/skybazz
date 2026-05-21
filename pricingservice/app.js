'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');

const pricingRoutes = require('./routes/pricingRoutes');
const sellerInsightsRoutes = require('./routes/sellerInsightsRoutes');
const securityHeaders = require('./middlewares/securityHeaders');
const requestContext = require('./middlewares/requestContext');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');
const { buildCorsOptions } = require('./utils/cors');

const app = express();

app.disable('x-powered-by');

app.use(securityHeaders);
app.use(cors(buildCorsOptions()));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(requestContext);

app.get('/', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'SHIPMENT PricingService is running',
    service: process.env.PRICING_SERVICE_NAME || 'pricingservice',
    version: process.env.PRICING_SERVICE_VERSION || '1.0.0',
    requestId: req.context?.requestId || null,
  });
});

app.get('/health', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'PricingService healthy',
    service: process.env.PRICING_SERVICE_NAME || 'pricingservice',
    version: process.env.PRICING_SERVICE_VERSION || '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    requestId: req.context?.requestId || null,
  });
});

app.use('/', pricingRoutes);
app.use('/api/seller', sellerInsightsRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;