'use strict';

const jwt = require('jsonwebtoken');
const errorHandler = require('../middlewares/errorHandler');
const notFound = require('../middlewares/notFound');
const requireRole = require('../middlewares/requireRole');
const requestContext = require('../middlewares/requestContext');
const { requireAuth } = require('../middlewares/authMiddleware');
const { validateCalculatePricingPayload } = require('../validators/pricingValidator');
const AppError = require('../utils/appError');

function createMockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  return res;
}

describe('pricing coverage branches', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    process.env = {
      ...originalEnv,
      JWT_SECRET: 'test-secret',
      DEFAULT_BASE_CURRENCY: 'USD',
      PRICING_SERVICE_NAME: 'pricingservice',
      PRICING_SERVICE_VERSION: '1.0.0',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('authMiddleware.requireAuth', () => {
    it('should return 401 for malformed authorization header', () => {
      const req = {
        headers: {
          authorization: 'Token abc123',
        },
        context: { requestId: 'req-auth-1' },
      };
      const res = createMockRes();
      const next = jest.fn();

      requireAuth(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Missing or invalid Authorization header',
        code: 'AUTH_REQUIRED',
        requestId: 'req-auth-1',
      });
    });

    it('should return 401 when jwt verification fails', () => {
      const req = {
        headers: {
          authorization: 'Bearer invalid-token',
        },
        context: { requestId: 'req-auth-2' },
      };
      const res = createMockRes();
      const next = jest.fn();

      jest.spyOn(jwt, 'verify').mockImplementationOnce(() => {
        throw new Error('jwt malformed');
      });

      requireAuth(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid or expired token',
        code: 'INVALID_TOKEN',
        requestId: 'req-auth-2',
      });
    });

    it('should populate req.user using header fallback values', () => {
      const req = {
        headers: {
          authorization: 'Bearer valid-token',
          'x-user-role': 'finance',
          'x-user-id': 'header-user-1',
        },
        context: { requestId: 'req-auth-3' },
      };
      const res = createMockRes();
      const next = jest.fn();

      jest.spyOn(jwt, 'verify').mockReturnValueOnce({
        email: 'finance@test.com',
      });

      requireAuth(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.user).toEqual({
        id: 'header-user-1',
        email: 'finance@test.com',
        role: 'FINANCE',
        partnerId: null,
        companyId: null,
      });
    });

    it('should populate req.user from decoded token values', () => {
      const req = {
        headers: {
          authorization: 'Bearer valid-decoded-token',
        },
        context: { requestId: 'req-auth-4' },
      };
      const res = createMockRes();
      const next = jest.fn();

      jest.spyOn(jwt, 'verify').mockReturnValueOnce({
        id: 'decoded-user-1',
        email: 'buyer@test.com',
        role: 'seller',
        partnerId: 'partner-1',
        companyId: 'company-1',
      });

      requireAuth(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.user).toEqual({
        id: 'decoded-user-1',
        email: 'buyer@test.com',
        role: 'SELLER',
        partnerId: 'partner-1',
        companyId: 'company-1',
      });
    });
  });

  describe('pricingController.getMetadata', () => {
    it('should fall back to default currency when exchange service throws', async () => {
      jest.doMock('../services/pricingService', () => ({
        calculateShipmentPricing: jest.fn(),
        getPricingHealth: jest.fn(),
      }));
      jest.doMock('../services/exchangeRateService', () => ({
        getSupportedCurrencies: jest.fn(() => {
          throw new Error('exchange service unavailable');
        }),
      }));

      const pricingController = require('../controllers/pricingController');
      const req = { context: { requestId: 'req-meta-1' } };
      const res = createMockRes();
      const next = jest.fn();

      await pricingController.getMetadata(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json.mock.calls[0][0].data.supportedCurrencies).toEqual(['USD']);
    });

    it('should use default currency when exchange service returns empty array', async () => {
      jest.doMock('../services/pricingService', () => ({
        calculateShipmentPricing: jest.fn(),
        getPricingHealth: jest.fn(),
      }));
      jest.doMock('../services/exchangeRateService', () => ({
        getSupportedCurrencies: jest.fn(() => []),
      }));

      const pricingController = require('../controllers/pricingController');
      const req = { context: { requestId: 'req-meta-2' } };
      const res = createMockRes();
      const next = jest.fn();

      await pricingController.getMetadata(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.json.mock.calls[0][0].data.supportedCurrencies).toEqual(['USD']);
    });

    it('should use exchange service currencies when non-empty array is returned', async () => {
      jest.doMock('../services/pricingService', () => ({
        calculateShipmentPricing: jest.fn(),
        getPricingHealth: jest.fn(),
      }));
      jest.doMock('../services/exchangeRateService', () => ({
        getSupportedCurrencies: jest.fn(() => ['USD', 'EUR', 'INR']),
      }));

      const pricingController = require('../controllers/pricingController');
      const req = { context: { requestId: 'req-meta-3' } };
      const res = createMockRes();
      const next = jest.fn();

      await pricingController.getMetadata(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.json.mock.calls[0][0].data.supportedCurrencies).toEqual(['USD', 'EUR', 'INR']);
    });
  });

  describe('pricingController.calculateQuote', () => {
    it('should pass service errors to next', async () => {
      const serviceError = new AppError('pricing failed', 503, 'PRICING_ENGINE_ERROR');

      jest.doMock('../services/pricingService', () => ({
        calculateShipmentPricing: jest.fn().mockRejectedValue(serviceError),
        getPricingHealth: jest.fn(),
      }));
      jest.doMock('../services/exchangeRateService', () => ({
        getSupportedCurrencies: jest.fn(),
      }));

      const pricingController = require('../controllers/pricingController');
      const req = {
        body: {
          weightKg: 10,
          lengthCm: 20,
          widthCm: 15,
          heightCm: 12,
          distanceKm: 100,
        },
        user: { id: 'user-1', role: 'BUYER' },
        context: { requestId: 'req-quote-1' },
      };
      const res = createMockRes();
      const next = jest.fn();

      await pricingController.calculateQuote(req, res, next);

      expect(next).toHaveBeenCalledWith(serviceError);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 200 with quote data on success', async () => {
      const serviceResponse = {
        quoteId: 'quote-1',
        totalPrice: 1250,
      };

      jest.doMock('../services/pricingService', () => ({
        calculateShipmentPricing: jest.fn().mockResolvedValue(serviceResponse),
        getPricingHealth: jest.fn(),
      }));
      jest.doMock('../services/exchangeRateService', () => ({
        getSupportedCurrencies: jest.fn(),
      }));

      const pricingController = require('../controllers/pricingController');
      const req = {
        body: {
          weightKg: 10,
          lengthCm: 20,
          widthCm: 15,
          heightCm: 12,
          distanceKm: 100,
        },
        user: { id: 'user-1', role: 'BUYER' },
        context: { requestId: 'req-quote-2' },
      };
      const res = createMockRes();
      const next = jest.fn();

      await pricingController.calculateQuote(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Pricing quote calculated successfully',
        requestId: 'req-quote-2',
        data: serviceResponse,
      });
    });

    it('should return requestId as null when req.context is missing', async () => {
      const serviceResponse = {
        quoteId: 'quote-null-request',
        totalPrice: 990,
      };

      jest.doMock('../services/pricingService', () => ({
        calculateShipmentPricing: jest.fn().mockResolvedValue(serviceResponse),
        getPricingHealth: jest.fn(),
      }));
      jest.doMock('../services/exchangeRateService', () => ({
        getSupportedCurrencies: jest.fn(),
      }));

      const pricingController = require('../controllers/pricingController');
      const req = {
        body: {
          weightKg: 10,
          lengthCm: 20,
          widthCm: 15,
          heightCm: 12,
          distanceKm: 100,
        },
        user: { id: 'user-1', role: 'BUYER' },
      };
      const res = createMockRes();
      const next = jest.fn();

      await pricingController.calculateQuote(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Pricing quote calculated successfully',
        requestId: null,
        data: serviceResponse,
      });
    });
  });

  describe('pricingController.recalculateQuote', () => {
    it('should pass service errors to next', async () => {
      const serviceError = new AppError('recalculation failed', 500, 'RECALCULATION_ERROR');

      jest.doMock('../services/pricingService', () => ({
        calculateShipmentPricing: jest.fn().mockRejectedValue(serviceError),
        getPricingHealth: jest.fn(),
      }));
      jest.doMock('../services/exchangeRateService', () => ({
        getSupportedCurrencies: jest.fn(),
      }));

      const pricingController = require('../controllers/pricingController');
      const req = {
        body: {
          weightKg: 8,
          lengthCm: 18,
          widthCm: 10,
          heightCm: 9,
          distanceKm: 50,
        },
        user: { id: 'user-2', role: 'BUYER' },
        context: { requestId: 'req-recalc-1' },
      };
      const res = createMockRes();
      const next = jest.fn();

      await pricingController.recalculateQuote(req, res, next);

      expect(next).toHaveBeenCalledWith(serviceError);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 200 with recalculated quote data on success', async () => {
      const serviceResponse = {
        quoteId: 'quote-2',
        totalPrice: 980,
      };

      jest.doMock('../services/pricingService', () => ({
        calculateShipmentPricing: jest.fn().mockResolvedValue(serviceResponse),
        getPricingHealth: jest.fn(),
      }));
      jest.doMock('../services/exchangeRateService', () => ({
        getSupportedCurrencies: jest.fn(),
      }));

      const pricingController = require('../controllers/pricingController');
      const req = {
        body: {
          weightKg: 8,
          lengthCm: 18,
          widthCm: 10,
          heightCm: 9,
          distanceKm: 50,
        },
        user: { id: 'user-2', role: 'BUYER' },
        context: { requestId: 'req-recalc-2' },
      };
      const res = createMockRes();
      const next = jest.fn();

      await pricingController.recalculateQuote(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Pricing quote recalculated successfully',
        requestId: 'req-recalc-2',
        data: serviceResponse,
      });
    });

    it('should return requestId as null when req.context is missing', async () => {
      const serviceResponse = {
        quoteId: 'quote-recalc-null-request',
        totalPrice: 880,
      };

      jest.doMock('../services/pricingService', () => ({
        calculateShipmentPricing: jest.fn().mockResolvedValue(serviceResponse),
        getPricingHealth: jest.fn(),
      }));
      jest.doMock('../services/exchangeRateService', () => ({
        getSupportedCurrencies: jest.fn(),
      }));

      const pricingController = require('../controllers/pricingController');
      const req = {
        body: {
          weightKg: 8,
          lengthCm: 18,
          widthCm: 10,
          heightCm: 9,
          distanceKm: 50,
        },
        user: { id: 'user-2', role: 'BUYER' },
      };
      const res = createMockRes();
      const next = jest.fn();

      await pricingController.recalculateQuote(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Pricing quote recalculated successfully',
        requestId: null,
        data: serviceResponse,
      });
    });
  });

  describe('pricingController.getHealth', () => {
    it('should return pricing health successfully', async () => {
      jest.doMock('../services/pricingService', () => ({
        calculateShipmentPricing: jest.fn(),
        getPricingHealth: jest.fn(() => ({
          status: 'ok',
          service: 'pricingservice',
        })),
      }));
      jest.doMock('../services/exchangeRateService', () => ({
        getSupportedCurrencies: jest.fn(),
      }));

      const pricingController = require('../controllers/pricingController');
      const req = { context: { requestId: 'req-health-1' } };
      const res = createMockRes();
      const next = jest.fn();

      await pricingController.getHealth(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        requestId: 'req-health-1',
        data: {
          status: 'ok',
          service: 'pricingservice',
        },
      });
    });

    it('should not crash when getPricingHealth returns fallback health', async () => {
      jest.doMock('../services/pricingService', () => ({
        calculateShipmentPricing: jest.fn(),
        getPricingHealth: jest.fn(() => ({
          status: 'degraded',
          service: 'pricingservice',
        })),
      }));
      jest.doMock('../services/exchangeRateService', () => ({
        getSupportedCurrencies: jest.fn(),
      }));

      const pricingController = require('../controllers/pricingController');
      const req = { context: { requestId: 'req-health-2' } };
      const res = createMockRes();
      const next = jest.fn();

      await pricingController.getHealth(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        requestId: 'req-health-2',
        data: {
          status: 'degraded',
          service: 'pricingservice',
        },
      });
    });
  });

  describe('app root branch', () => {
    it('should use env fallback values on root route when service env is missing', async () => {
      process.env.PRICING_SERVICE_NAME = '';
      process.env.PRICING_SERVICE_VERSION = '';

      jest.doMock('../db', () => ({
        query: jest.fn(),
        ping: jest.fn(),
        close: jest.fn(),
        pool: {},
      }));

      const request = require('supertest');
      const app = require('../app');

      const response = await request(app)
        .get('/')
        .set('x-request-id', 'req-root-fallback');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.service).toBe('pricingservice');
      expect(response.body.version).toBe('1.0.0');
      expect(response.body.requestId).toBe('req-root-fallback');
    });
  });

  describe('errorHandler', () => {
    it('should return 500 and default code when error has no statusCode or code', () => {
      const req = { context: { requestId: 'req-err-1' } };
      const res = createMockRes();
      const err = new Error('unexpected failure');

      errorHandler(err, req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'unexpected failure',
        code: 'INTERNAL_ERROR',
        details: null,
        requestId: 'req-err-1',
      });
    });

    it('should return custom status, code and details when provided', () => {
      const req = { context: { requestId: 'req-err-2' } };
      const res = createMockRes();
      const err = {
        message: 'validation failed',
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        details: { field: 'weightKg' },
      };

      errorHandler(err, req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'validation failed',
        code: 'VALIDATION_ERROR',
        details: { field: 'weightKg' },
        requestId: 'req-err-2',
      });
    });

    it('should use fallback message when error message is missing', () => {
      const req = { context: { requestId: 'req-err-3' } };
      const res = createMockRes();
      const err = {
        statusCode: 500,
      };

      errorHandler(err, req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
        details: null,
        requestId: 'req-err-3',
      });
    });
  });

  describe('notFound middleware', () => {
    it('should return 404 with request path and request id', () => {
      const req = {
        originalUrl: '/missing-route',
        context: { requestId: 'req-404-1' },
      };
      const res = createMockRes();

      notFound(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Route not found',
        code: 'ROUTE_NOT_FOUND',
        path: '/missing-route',
        requestId: 'req-404-1',
      });
    });

    it('should handle missing request context', () => {
      const req = {
        originalUrl: '/missing-no-context',
      };
      const res = createMockRes();

      notFound(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Route not found',
        code: 'ROUTE_NOT_FOUND',
        path: '/missing-no-context',
        requestId: null,
      });
    });
  });

  describe('requireRole middleware', () => {
    it('should call next when role is allowed', () => {
      const req = {
        user: {
          role: 'FINANCE',
        },
        context: { requestId: 'req-role-1' },
      };
      const res = createMockRes();
      const next = jest.fn();
      const middleware = requireRole('ADMIN', 'FINANCE');

      middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 403 when user role is not allowed', () => {
      const req = {
        user: {
          role: 'BUYER',
        },
        context: { requestId: 'req-role-2' },
      };
      const res = createMockRes();
      const next = jest.fn();
      const middleware = requireRole('ADMIN', 'FINANCE');

      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Forbidden',
        code: 'FORBIDDEN',
        requestId: 'req-role-2',
        requiredRoles: ['ADMIN', 'FINANCE'],
      });
    });

    it('should return 403 when req.user is missing', () => {
      const req = {
        context: { requestId: 'req-role-3' },
      };
      const res = createMockRes();
      const next = jest.fn();
      const middleware = requireRole('ADMIN');

      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Forbidden',
        code: 'FORBIDDEN',
        requestId: 'req-role-3',
        requiredRoles: ['ADMIN'],
      });
    });
  });

  describe('requestContext middleware', () => {
    it('should use existing x-request-id header', () => {
      const req = {
        headers: {
          'x-request-id': 'existing-request-id',
        },
      };
      const res = createMockRes();
      const next = jest.fn();

      requestContext(req, res, next);

      expect(req.context.requestId).toBe('existing-request-id');
      expect(req.context.service).toBe('pricingservice');
      expect(req.context.clientService).toBeNull();
      expect(typeof req.context.receivedAt).toBe('string');
      expect(res.setHeader).toHaveBeenCalledWith('x-request-id', 'existing-request-id');
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should generate request id when x-request-id header is missing', () => {
      const req = {
        headers: {},
      };
      const res = createMockRes();
      const next = jest.fn();

      requestContext(req, res, next);

      expect(req.context.service).toBe('pricingservice');
      expect(req.context.clientService).toBeNull();
      expect(typeof req.context.receivedAt).toBe('string');
      expect(typeof req.context.requestId).toBe('string');
      expect(req.context.requestId.startsWith('req_')).toBe(true);
      expect(res.setHeader).toHaveBeenCalledWith('x-request-id', req.context.requestId);
      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe('pricingValidator.validateCalculatePricingPayload', () => {
    it('should reject invalid shipmentType', () => {
      expect(() =>
        validateCalculatePricingPayload({
          shipmentType: 'INVALID_TYPE',
          weightKg: 1,
          lengthCm: 1,
          widthCm: 1,
          heightCm: 1,
          distanceKm: 0,
        })
      ).toThrow('Invalid shipmentType');
    });

    it('should reject invalid serviceLevel', () => {
      expect(() =>
        validateCalculatePricingPayload({
          serviceLevel: 'INVALID_LEVEL',
          weightKg: 1,
          lengthCm: 1,
          widthCm: 1,
          heightCm: 1,
          distanceKm: 0,
        })
      ).toThrow('Invalid serviceLevel');
    });

    it('should reject invalid transportMode', () => {
      expect(() =>
        validateCalculatePricingPayload({
          transportMode: 'SPACE',
          weightKg: 1,
          lengthCm: 1,
          widthCm: 1,
          heightCm: 1,
          distanceKm: 0,
        })
      ).toThrow('Invalid transportMode');
    });

    it('should reject invalid courier', () => {
      expect(() =>
        validateCalculatePricingPayload({
          courier: 'INVALID_COURIER',
          weightKg: 1,
          lengthCm: 1,
          widthCm: 1,
          heightCm: 1,
          distanceKm: 0,
        })
      ).toThrow('Invalid courier');
    });

    it('should reject invalid partnerTier', () => {
      expect(() =>
        validateCalculatePricingPayload({
          partnerTier: 'INVALID_TIER',
          weightKg: 1,
          lengthCm: 1,
          widthCm: 1,
          heightCm: 1,
          distanceKm: 0,
        })
      ).toThrow('Invalid partnerTier');
    });

    it('should reject invalid lengthCm', () => {
      expect(() =>
        validateCalculatePricingPayload({
          weightKg: 1,
          lengthCm: 0,
          widthCm: 1,
          heightCm: 1,
          distanceKm: 0,
        })
      ).toThrow('lengthCm must be a positive number');
    });

    it('should reject invalid widthCm', () => {
      expect(() =>
        validateCalculatePricingPayload({
          weightKg: 1,
          lengthCm: 1,
          widthCm: 0,
          heightCm: 1,
          distanceKm: 0,
        })
      ).toThrow('widthCm must be a positive number');
    });

    it('should reject invalid heightCm', () => {
      expect(() =>
        validateCalculatePricingPayload({
          weightKg: 1,
          lengthCm: 1,
          widthCm: 1,
          heightCm: 0,
          distanceKm: 0,
        })
      ).toThrow('heightCm must be a positive number');
    });

    it('should reject negative distanceKm', () => {
      expect(() =>
        validateCalculatePricingPayload({
          weightKg: 1,
          lengthCm: 1,
          widthCm: 1,
          heightCm: 1,
          distanceKm: -1,
        })
      ).toThrow('distanceKm must be zero or a positive number');
    });

    it('should reject negative declaredValue', () => {
      expect(() =>
        validateCalculatePricingPayload({
          weightKg: 1,
          lengthCm: 1,
          widthCm: 1,
          heightCm: 1,
          distanceKm: 0,
          declaredValue: -1,
        })
      ).toThrow('declaredValue must be zero or a positive number');
    });

    it('should reject invalid quantity', () => {
      expect(() =>
        validateCalculatePricingPayload({
          weightKg: 1,
          lengthCm: 1,
          widthCm: 1,
          heightCm: 1,
          distanceKm: 0,
          quantity: 0,
        })
      ).toThrow('quantity must be a positive number');
    });

    it('should default metadata to empty object when invalid metadata is provided', () => {
      const result = validateCalculatePricingPayload({
        weightKg: 1,
        lengthCm: 1,
        widthCm: 1,
        heightCm: 1,
        distanceKm: 0,
        metadata: 'not-an-object',
      });

      expect(result.metadata).toEqual({});
    });

    it('should preserve metadata object when valid metadata is provided', () => {
      const result = validateCalculatePricingPayload({
        weightKg: 1,
        lengthCm: 1,
        widthCm: 1,
        heightCm: 1,
        distanceKm: 0,
        metadata: {
          fragile: true,
          origin: 'HYD',
        },
      });

      expect(result.metadata).toEqual({
        fragile: true,
        origin: 'HYD',
      });
    });
  });
});