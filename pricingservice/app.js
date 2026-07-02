'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const db = require('./db');

const pricingRoutes = require('./routes/pricingRoutes');
const sellerInsightsRoutes = require('./routes/sellerInsightsRoutes');

const requestContext = require('./middlewares/requestContext');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

const corsOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(helmet());

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || corsOrigins.length === 0 || corsOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(requestContext);

app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    service: process.env.PRICING_SERVICE_NAME || 'pricingservice',
    version: process.env.PRICING_SERVICE_VERSION || '1.0.0',
    requestId: req.context?.requestId || null,
  });
});

app.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    service: process.env.PRICING_SERVICE_NAME || 'pricingservice',
    version: process.env.PRICING_SERVICE_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

app.get('/db-check', async (_req, res, next) => {
  try {
    const [rows] = await db.query('SELECT 1 AS ok');
    res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    next(error);
  }
});

app.post('/test-save', async (req, res, next) => {
  try {
    const message = req.body.message || 'hello from api';

    const [result] = await db.query(
      'INSERT INTO api_test_logs (message) VALUES (?)',
      [message]
    );

    res.status(201).json({
      success: true,
      insertedId: result.insertId,
      message,
    });
  } catch (error) {
    next(error);
  }
});

app.get('/test-read', async (_req, res, next) => {
  try {
    const [rows] = await db.query(
      'SELECT id, message, created_at FROM api_test_logs ORDER BY id DESC LIMIT 5'
    );

    res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    next(error);
  }
});

app.use('/', pricingRoutes);
app.use('/seller-insights', sellerInsightsRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;