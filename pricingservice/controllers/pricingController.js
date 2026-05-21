'use strict';

const { validateCalculatePricingPayload } = require('../validators/pricingValidator');
const { calculateShipmentPricing, getPricingHealth } = require('../services/pricingService');
const { getSupportedCurrencies } = require('../services/exchangeRateService');
const {
  SUPPORTED_SERVICE_LEVELS,
  SUPPORTED_SHIPMENT_TYPES,
  SUPPORTED_TRANSPORT_MODES,
  SUPPORTED_PARTNER_TIERS,
  SUPPORTED_COURIERS,
} = require('../utils/constants');

async function calculateQuote(req, res, next) {
  try {
    const payload = validateCalculatePricingPayload(req.body);
    const result = await calculateShipmentPricing(payload, req.user || null);

    return res.status(200).json({
      success: true,
      message: 'Pricing quote calculated successfully',
      requestId: req.context?.requestId || null,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

async function recalculateQuote(req, res, next) {
  try {
    const payload = validateCalculatePricingPayload(req.body);
    const result = await calculateShipmentPricing(payload, req.user || null);

    return res.status(200).json({
      success: true,
      message: 'Pricing quote recalculated successfully',
      requestId: req.context?.requestId || null,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

async function getMetadata(req, res, next) {
  try {
    let supportedCurrencies = [process.env.DEFAULT_BASE_CURRENCY || 'USD'];

    try {
      const currencies = getSupportedCurrencies();

      if (Array.isArray(currencies) && currencies.length > 0) {
        supportedCurrencies = currencies;
      }
    } catch (_error) {
      supportedCurrencies = [process.env.DEFAULT_BASE_CURRENCY || 'USD'];
    }

    return res.status(200).json({
      success: true,
      message: 'Pricing metadata fetched successfully',
      requestId: req.context?.requestId || null,
      data: {
        supportedCurrencies,
        serviceLevels: SUPPORTED_SERVICE_LEVELS,
        shipmentTypes: SUPPORTED_SHIPMENT_TYPES,
        transportModes: SUPPORTED_TRANSPORT_MODES,
        couriers: SUPPORTED_COURIERS,
        partnerTiers: SUPPORTED_PARTNER_TIERS,
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function getHealth(req, res, next) {
  try {
    return res.status(200).json({
      success: true,
      requestId: req.context?.requestId || null,
      data: getPricingHealth(),
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  calculateQuote,
  recalculateQuote,
  getMetadata,
  getHealth,
};