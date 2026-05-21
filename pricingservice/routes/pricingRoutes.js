'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const pricingController = require('../controllers/pricingController');
const { requireAuth } = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/requireRole');

const router = express.Router();

const metadataLimiter = rateLimit({
  windowMs: Number(process.env.PRICING_METADATA_RATE_LIMIT_WINDOW_MS || 60 * 1000),
  max: Number(process.env.PRICING_METADATA_RATE_LIMIT_MAX || 60),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many metadata requests, please try again later',
    code: 'RATE_LIMITED',
  },
});

const quoteLimiter = rateLimit({
  windowMs: Number(process.env.PRICING_QUOTE_RATE_LIMIT_WINDOW_MS || 60 * 1000),
  max: Number(process.env.PRICING_QUOTE_RATE_LIMIT_MAX || 25),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many pricing requests, please try again later',
    code: 'RATE_LIMITED',
  },
});

const internalLimiter = rateLimit({
  windowMs: Number(process.env.PRICING_INTERNAL_RATE_LIMIT_WINDOW_MS || 60 * 1000),
  max: Number(process.env.PRICING_INTERNAL_RATE_LIMIT_MAX || 100),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many internal pricing requests, please try again later',
    code: 'RATE_LIMITED',
  },
});

router.get('/health', pricingController.getHealth);

router.get(
  '/api/v1/pricing/metadata',
  metadataLimiter,
  requireAuth,
  pricingController.getMetadata
);

router.post(
  '/api/v1/pricing/quote',
  quoteLimiter,
  requireAuth,
  pricingController.calculateQuote
);

router.post(
  '/api/v1/pricing/recalculate',
  quoteLimiter,
  requireAuth,
  pricingController.recalculateQuote
);

router.get(
  '/api/v1/pricing/internal/finance-metadata',
  internalLimiter,
  requireAuth,
  requireRole('ADMIN', 'FINANCE', 'OPS'),
  pricingController.getMetadata
);

module.exports = router;