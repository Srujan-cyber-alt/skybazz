'use strict';

jest.mock('./db', () => ({
  query: jest.fn(),
  ping: jest.fn(),
  close: jest.fn(),
}));

jest.mock('./routes/pricingRoutes', () => {
  const express = require('express');
  const router = express.Router();
  router.get('/pricing-ping', (_req, res) => res.status(200).json({ ok: true }));
  return router;
});

jest.mock('./routes/sellerInsightsRoutes', () => {
  const express = require('express');
  const router = express.Router();
  router.get('/seller-insights-ping', (_req, res) => res.status(200).json({ ok: true }));
  return router;
});

const request = require('supertest');
const app = require('./app');
const db = require('./db');

describe('app', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns health payload', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns db-check success', async () => {
    db.query.mockResolvedValue([[{ ok: 1 }]]);
    const res = await request(app).get('/db-check');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(db.query).toHaveBeenCalledWith('SELECT 1 AS ok');
  });

  it('returns 404 for unknown route', async () => {
    const res = await request(app).get('/unknown-route');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});