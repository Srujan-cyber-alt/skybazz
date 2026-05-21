'use strict';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.PRICING_SERVICE_NAME = process.env.PRICING_SERVICE_NAME || 'pricingservice';
process.env.PRICING_SERVICE_VERSION = process.env.PRICING_SERVICE_VERSION || '1.0.0';
process.env.DEFAULT_BASE_CURRENCY = process.env.DEFAULT_BASE_CURRENCY || 'USD';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');

function signToken(overrides = {}) {
  return jwt.sign(
    {
      id: overrides.id || 'user_123',
      email: overrides.email || 'test@example.com',
      role: overrides.role || 'BUYER',
      partnerId: overrides.partnerId || null,
      companyId: overrides.companyId || null,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '1h',
      ...(process.env.JWT_AUDIENCE ? { audience: process.env.JWT_AUDIENCE } : {}),
      ...(process.env.JWT_ISSUER ? { issuer: process.env.JWT_ISSUER } : {}),
    }
  );
}

function validPayload(overrides = {}) {
  return {
    shipmentType: 'DOMESTIC',
    transportMode: 'ROAD',
    serviceLevel: 'STANDARD',
    courier: 'SHIPMENT_EXPRESS',
    currency: 'USD',
    baseCurrency: 'USD',
    partnerTier: 'STANDARD',
    weightKg: 12,
    lengthCm: 40,
    widthCm: 30,
    heightCm: 20,
    distanceKm: 120,
    declaredValue: 500,
    quantity: 1,
    insuranceRequired: true,
    hazardous: false,
    remoteArea: false,
    complianceChecksRequired: true,
    customsDeclared: true,
    originCountry: 'IN',
    destinationCountry: 'IN',
    productCategory: 'GENERAL',
    customerType: 'STANDARD',
    ...overrides,
  };
}

describe('PricingService routes', () => {
  describe('GET /health', () => {
    it('should return health response', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('PricingService healthy');
      expect(response.body.service).toBe(process.env.PRICING_SERVICE_NAME);
      expect(response.body.version).toBe(process.env.PRICING_SERVICE_VERSION);
      expect(response.body.requestId).toBeTruthy();
      expect(response.headers['x-request-id']).toBeTruthy();
    });
  });

  describe('GET /api/v1/pricing/metadata', () => {
    it('should reject request without token', async () => {
      const response = await request(app).get('/api/v1/pricing/metadata');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('AUTH_REQUIRED');
      expect(response.body.requestId).toBeTruthy();
    });

    it('should return metadata for authenticated user', async () => {
      const token = signToken({ role: 'BUYER' });

      const response = await request(app)
        .get('/api/v1/pricing/metadata')
        .set('Authorization', `Bearer ${token}`);

      expect(response.body.requestId).toBeTruthy();

      if (response.status !== 200) {
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBeTruthy();
        throw new Error(`GET /api/v1/pricing/metadata failed: ${JSON.stringify(response.body)}`);
      }

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeTruthy();
      expect(Array.isArray(response.body.data.supportedCurrencies)).toBe(true);
      expect(Array.isArray(response.body.data.serviceLevels)).toBe(true);
      expect(Array.isArray(response.body.data.transportModes)).toBe(true);
      expect(Array.isArray(response.body.data.couriers)).toBe(true);
    });
  });

  describe('GET /api/v1/pricing/internal/finance-metadata', () => {
    it('should reject authenticated user with wrong role', async () => {
      const token = signToken({ role: 'BUYER' });

      const response = await request(app)
        .get('/api/v1/pricing/internal/finance-metadata')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('FORBIDDEN');
      expect(response.body.requiredRoles).toEqual(['ADMIN', 'FINANCE', 'OPS']);
      expect(response.body.requestId).toBeTruthy();
    });

    it('should allow FINANCE role', async () => {
      const token = signToken({ role: 'FINANCE' });

      const response = await request(app)
        .get('/api/v1/pricing/internal/finance-metadata')
        .set('Authorization', `Bearer ${token}`);

      expect(response.body.requestId).toBeTruthy();

      if (response.status !== 200) {
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBeTruthy();
        throw new Error(`GET /api/v1/pricing/internal/finance-metadata failed: ${JSON.stringify(response.body)}`);
      }

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeTruthy();
      expect(Array.isArray(response.body.data.partnerTiers)).toBe(true);
    });
  });

  describe('POST /api/v1/pricing/quote', () => {
    it('should reject request without token', async () => {
      const response = await request(app)
        .post('/api/v1/pricing/quote')
        .send(validPayload());

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('AUTH_REQUIRED');
    });

    it('should reject invalid payload', async () => {
      const token = signToken({ role: 'SELLER' });

      const response = await request(app)
        .post('/api/v1/pricing/quote')
        .set('Authorization', `Bearer ${token}`)
        .send(validPayload({ weightKg: 0 }));

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('VALIDATION_ERROR');
      expect(response.body.requestId).toBeTruthy();
    });

    it('should calculate quote successfully', async () => {
      const token = signToken({
        role: 'SELLER',
        partnerId: 'VIP_PARTNER_001',
        companyId: 'company_123',
      });

      const response = await request(app)
        .post('/api/v1/pricing/quote')
        .set('Authorization', `Bearer ${token}`)
        .send(validPayload({
          shipmentType: 'INTERNATIONAL',
          transportMode: 'AIR',
          serviceLevel: 'EXPRESS',
          courier: 'DHL',
          currency: 'INR',
          baseCurrency: 'USD',
          partnerTier: 'ENTERPRISE',
          weightKg: 22,
          lengthCm: 50,
          widthCm: 35,
          heightCm: 28,
          distanceKm: 950,
          declaredValue: 3200,
          insuranceRequired: true,
          remoteArea: true,
          complianceChecksRequired: true,
          customsDeclared: true,
          originCountry: 'IN',
          destinationCountry: 'AE',
          productCategory: 'ELECTRONICS',
          customerType: 'ENTERPRISE',
          discountCode: 'ENTERPRISE15',
          hsCode: '847130',
        }));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Pricing quote calculated successfully');
      expect(response.body.data).toBeTruthy();
      expect(response.body.data.quoteId).toBeTruthy();
      expect(response.body.data.shipment).toBeTruthy();
      expect(response.body.data.breakdownBaseCurrency).toBeTruthy();
      expect(response.body.data.breakdownBaseCurrency.freight).toBeTruthy();
      expect(Array.isArray(response.body.data.breakdownBaseCurrency.surcharges)).toBe(true);
      expect(response.body.data.breakdownBaseCurrency.customs).toBeTruthy();
      expect(response.body.data.breakdownBaseCurrency.tax).toBeTruthy();
      expect(response.body.data.settlementCurrency).toBeTruthy();
      expect(response.body.data.analytics).toBeTruthy();
      expect(response.body.data.visibility).toBeTruthy();
      expect(response.body.requestId).toBeTruthy();
    });
  });

  describe('POST /api/v1/pricing/recalculate', () => {
    it('should recalculate quote successfully', async () => {
      const token = signToken({ role: 'OPS' });

      const response = await request(app)
        .post('/api/v1/pricing/recalculate')
        .set('Authorization', `Bearer ${token}`)
        .send(validPayload({
          shipmentType: 'DOMESTIC',
          transportMode: 'ROAD',
          serviceLevel: 'PRIORITY',
          courier: 'BLUEDART',
          weightKg: 8,
          lengthCm: 32,
          widthCm: 22,
          heightCm: 18,
          distanceKm: 260,
          declaredValue: 900,
          insuranceRequired: false,
          remoteArea: true,
          complianceChecksRequired: true,
          customsDeclared: false,
          originCountry: 'IN',
          destinationCountry: 'IN',
          productCategory: 'GENERAL',
          discountCode: 'WELCOME10',
        }));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Pricing quote recalculated successfully');
      expect(response.body.data).toBeTruthy();
      expect(response.body.data.breakdownBaseCurrency).toBeTruthy();
      expect(response.body.data.breakdownBaseCurrency.totalPayable).toBeGreaterThanOrEqual(0);
      expect(response.body.requestId).toBeTruthy();
    });
  });

  describe('GET unknown route', () => {
    it('should return 404 with request id', async () => {
      const response = await request(app).get('/unknown-route');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('ROUTE_NOT_FOUND');
      expect(response.body.requestId).toBeTruthy();
    });
  });
});