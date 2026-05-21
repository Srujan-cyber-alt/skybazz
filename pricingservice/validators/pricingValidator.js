'use strict';

const AppError = require('../utils/appError');
const {
  SUPPORTED_SERVICE_LEVELS,
  SUPPORTED_SHIPMENT_TYPES,
  SUPPORTED_TRANSPORT_MODES,
  SUPPORTED_PARTNER_TIERS,
  SUPPORTED_COURIERS,
} = require('../utils/constants');

function toNumber(value, fallback = null) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function normalizeUpper(value, fallback = null) {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).trim().toUpperCase();
}

function assertEnum(name, value, allowed) {
  if (!allowed.includes(value)) {
    throw new AppError(`Invalid ${name}`, 400, 'VALIDATION_ERROR', {
      field: name,
      allowed,
      received: value,
    });
  }
}

function validateCalculatePricingPayload(body = {}) {
  const shipmentType = normalizeUpper(body.shipmentType, 'DOMESTIC');
  const transportMode = normalizeUpper(body.transportMode, 'ROAD');
  const serviceLevel = normalizeUpper(body.serviceLevel, 'STANDARD');
  const courier = normalizeUpper(body.courier, 'SHIPMENT_EXPRESS');
  const currency = normalizeUpper(body.currency, process.env.DEFAULT_BASE_CURRENCY || 'USD');
  const baseCurrency = normalizeUpper(body.baseCurrency, process.env.DEFAULT_BASE_CURRENCY || 'USD');
  const partnerTier = normalizeUpper(body.partnerTier, 'STANDARD');

  assertEnum('shipmentType', shipmentType, SUPPORTED_SHIPMENT_TYPES);
  assertEnum('transportMode', transportMode, SUPPORTED_TRANSPORT_MODES);
  assertEnum('serviceLevel', serviceLevel, SUPPORTED_SERVICE_LEVELS);
  assertEnum('courier', courier, SUPPORTED_COURIERS);
  assertEnum('partnerTier', partnerTier, SUPPORTED_PARTNER_TIERS);

  const weightKg = toNumber(body.weightKg);
  const lengthCm = toNumber(body.lengthCm);
  const widthCm = toNumber(body.widthCm);
  const heightCm = toNumber(body.heightCm);
  const distanceKm = toNumber(body.distanceKm);
  const declaredValue = toNumber(body.declaredValue, 0);
  const quantity = toNumber(body.quantity, 1);
  const insuranceRequired = Boolean(body.insuranceRequired);
  const hazardous = Boolean(body.hazardous);
  const remoteArea = Boolean(body.remoteArea);
  const complianceChecksRequired = body.complianceChecksRequired !== false;
  const customsDeclared = body.customsDeclared !== false;

  if (!Number.isFinite(weightKg) || weightKg <= 0) {
    throw new AppError('weightKg must be a positive number', 400, 'VALIDATION_ERROR', {
      field: 'weightKg',
    });
  }

  if (!Number.isFinite(lengthCm) || lengthCm <= 0) {
    throw new AppError('lengthCm must be a positive number', 400, 'VALIDATION_ERROR', {
      field: 'lengthCm',
    });
  }

  if (!Number.isFinite(widthCm) || widthCm <= 0) {
    throw new AppError('widthCm must be a positive number', 400, 'VALIDATION_ERROR', {
      field: 'widthCm',
    });
  }

  if (!Number.isFinite(heightCm) || heightCm <= 0) {
    throw new AppError('heightCm must be a positive number', 400, 'VALIDATION_ERROR', {
      field: 'heightCm',
    });
  }

  if (!Number.isFinite(distanceKm) || distanceKm < 0) {
    throw new AppError('distanceKm must be zero or a positive number', 400, 'VALIDATION_ERROR', {
      field: 'distanceKm',
    });
  }

  if (!Number.isFinite(declaredValue) || declaredValue < 0) {
    throw new AppError('declaredValue must be zero or a positive number', 400, 'VALIDATION_ERROR', {
      field: 'declaredValue',
    });
  }

  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new AppError('quantity must be a positive number', 400, 'VALIDATION_ERROR', {
      field: 'quantity',
    });
  }

  return {
    shipmentType,
    transportMode,
    serviceLevel,
    courier,
    currency,
    baseCurrency,
    partnerTier,
    weightKg,
    lengthCm,
    widthCm,
    heightCm,
    distanceKm,
    declaredValue,
    quantity,
    insuranceRequired,
    hazardous,
    remoteArea,
    complianceChecksRequired,
    customsDeclared,
    originCountry: normalizeUpper(body.originCountry, 'IN'),
    destinationCountry: normalizeUpper(body.destinationCountry, 'IN'),
    originState: body.originState || null,
    destinationState: body.destinationState || null,
    productCategory: normalizeUpper(body.productCategory, 'GENERAL'),
    hsCode: body.hsCode ? String(body.hsCode).trim() : null,
    discountCode: body.discountCode ? String(body.discountCode).trim().toUpperCase() : null,
    partnerId: body.partnerId ? String(body.partnerId).trim() : null,
    customerType: normalizeUpper(body.customerType, 'STANDARD'),
    metadata: body.metadata && typeof body.metadata === 'object' ? body.metadata : {},
  };
}

module.exports = {
  validateCalculatePricingPayload,
};