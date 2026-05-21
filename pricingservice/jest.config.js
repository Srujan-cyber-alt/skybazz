'use strict';

module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.js'],
  collectCoverage: true,
  collectCoverageFrom: [
    'app.js',
    'routes/pricingRoutes.js',
    'controllers/pricingController.js',
    'middlewares/authMiddleware.js',
    'middlewares/errorHandler.js',
    'middlewares/notFound.js',
    'middlewares/requestContext.js',
    'middlewares/requireRole.js',
    'middlewares/securityHeaders.js',
    'services/pricingService.js',
    'services/customsService.js',
    'services/discountService.js',
    'services/exchangeRateService.js',
    'services/partnerPricingService.js',
    'services/taxService.js',
    'validators/pricingValidator.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  clearMocks: true,
  verbose: true
};