'use strict';

const db = require('../db');
const { convertAmount } = require('./exchangeRateService');
const { calculateTax } = require('./taxService');
const { calculateCustoms } = require('./customsService');
const { calculateDiscount } = require('./discountService');
const { getPartnerAdjustment } = require('./partnerPricingService');
const { buildAnalyticsSnapshot } = require('./analyticsService');

function round2(value) {
  return Number(Number(value || 0).toFixed(2));
}

function volumetricWeightKg(lengthCm, widthCm, heightCm, transportMode) {
  const divisorMap = {
    AIR: 5000,
    ROAD: 4500,
    SEA: 1000,
    RAIL: 4000,
  };

  const divisor = divisorMap[transportMode] || 5000;
  return round2((lengthCm * widthCm * heightCm) / divisor);
}

function getChargeableWeight(actualWeight, volumetricWeight) {
  return round2(Math.max(actualWeight, volumetricWeight));
}

function getServiceLevelMultiplier(serviceLevel) {
  const map = {
    ECONOMY: 0.9,
    STANDARD: 1,
    EXPRESS: 1.25,
    PRIORITY: 1.45,
    SAME_DAY: 1.9,
  };

  return map[serviceLevel] || 1;
}

function getTransportModeBaseRate(transportMode) {
  const map = {
    ROAD: 0.42,
    AIR: 1.9,
    SEA: 0.18,
    RAIL: 0.34,
  };

  return map[transportMode] || 0.42;
}

function getCourierMultiplier(courier) {
  const map = {
    SHIPMENT_EXPRESS: 1,
    DHL: 1.18,
    FEDEX: 1.2,
    UPS: 1.16,
    BLUEDART: 1.08,
    ARAMEX: 1.12,
  };

  return map[courier] || 1;
}

function buildSurcharges(payload) {
  const surcharges = [];

  const fuelRate = Number(process.env.DEFAULT_FUEL_SURCHARGE_RATE || 0.08);
  const fuelBase = payload.freightBase;

  surcharges.push({
    code: 'FUEL_SURCHARGE',
    label: 'Fuel surcharge',
    amount: round2(fuelBase * fuelRate),
  });

  if (payload.remoteArea) {
    surcharges.push({
      code: 'REMOTE_AREA',
      label: 'Remote area surcharge',
      amount: round2(Number(process.env.DEFAULT_REMOTE_AREA_SURCHARGE || 18)),
    });
  }

  if (payload.hazardous) {
    surcharges.push({
      code: 'HAZARDOUS_GOODS',
      label: 'Hazardous goods handling',
      amount: round2(35),
    });
  }

  surcharges.push({
    code: 'HANDLING_FEE',
    label: 'Handling fee',
    amount: round2(Number(process.env.DEFAULT_HANDLING_FEE || 12)),
  });

  if (payload.complianceChecksRequired) {
    surcharges.push({
      code: 'COMPLIANCE_FEE',
      label: 'Compliance screening fee',
      amount: round2(Number(process.env.DEFAULT_COMPLIANCE_FEE || 15)),
    });
  }

  return surcharges;
}

function calculateBaseFreight(payload) {
  const baseRate = getTransportModeBaseRate(payload.transportMode);
  const serviceLevelMultiplier = getServiceLevelMultiplier(payload.serviceLevel);
  const courierMultiplier = getCourierMultiplier(payload.courier);

  const distanceComponent = round2(payload.distanceKm * baseRate);
  const weightComponent = round2(payload.chargeableWeightKg * 1.75);
  const baseFreight = round2(
    (distanceComponent + weightComponent) * serviceLevelMultiplier * courierMultiplier
  );

  return {
    baseRate,
    serviceLevelMultiplier,
    courierMultiplier,
    distanceComponent,
    weightComponent,
    baseFreight,
  };
}

function calculateInsurance(payload) {
  if (!payload.insuranceRequired) return 0;
  const rate = Number(process.env.DEFAULT_INSURANCE_RATE || 0.0125);
  return round2(payload.declaredValue * rate);
}

function buildQuoteId() {
  return `quote_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeUserContext(userContext = null) {
  if (!userContext) {
    return {
      id: null,
      role: null,
      partnerId: null,
      companyId: null,
    };
  }

  return {
    id: userContext.id || userContext.userId || null,
    role: userContext.role || null,
    partnerId: userContext.partnerId || null,
    companyId: userContext.companyId || null,
  };
}

async function persistQuote(result, input, userContext) {
  const normalizedUser = normalizeUserContext(userContext);

  const sql = `
    INSERT INTO pricing_quotes (
      quote_id,
      user_id,
      user_role,
      partner_id,
      company_id,
      shipment_type,
      transport_mode,
      service_level,
      courier,
      origin_country,
      destination_country,
      weight_kg,
      volumetric_weight_kg,
      chargeable_weight_kg,
      length_cm,
      width_cm,
      height_cm,
      distance_km,
      declared_value,
      product_category,
      hs_code,
      base_currency,
      settlement_currency,
      exchange_rate,
      freight_amount,
      insurance_amount,
      surcharge_total,
      customs_total,
      partner_adjustment_amount,
      discount_amount,
      taxable_amount,
      tax_total,
      platform_fee,
      total_payable_base,
      total_payable_settlement,
      customs_declared,
      compliance_checks_required,
      insurance_required,
      remote_area,
      hazardous,
      analytics_json,
      quote_json
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `;

  const params = [
    result.quoteId,
    normalizedUser.id,
    normalizedUser.role,
    normalizedUser.partnerId,
    normalizedUser.companyId,
    result.shipment.shipmentType,
    result.shipment.transportMode,
    result.shipment.serviceLevel,
    result.shipment.courier,
    result.shipment.originCountry,
    result.shipment.destinationCountry,
    result.shipment.weightKg,
    result.shipment.volumetricWeightKg,
    result.shipment.chargeableWeightKg,
    result.shipment.dimensionsCm.length,
    result.shipment.dimensionsCm.width,
    result.shipment.dimensionsCm.height,
    result.shipment.distanceKm,
    result.shipment.declaredValue,
    result.shipment.productCategory || null,
    result.shipment.hsCode || null,
    result.breakdownBaseCurrency.currency,
    result.settlementCurrency.currency,
    result.settlementCurrency.exchangeRate,
    result.breakdownBaseCurrency.freight.amount,
    result.breakdownBaseCurrency.insurance.amount,
    result.breakdownBaseCurrency.surchargeTotal,
    result.breakdownBaseCurrency.customs.totalCustomsCost || 0,
    result.breakdownBaseCurrency.partnerAdjustment.adjustmentAmount || 0,
    result.breakdownBaseCurrency.discount.discountAmount || 0,
    result.breakdownBaseCurrency.taxableAmount,
    result.breakdownBaseCurrency.tax.totalTax || 0,
    result.breakdownBaseCurrency.platformFee,
    result.breakdownBaseCurrency.totalPayable,
    result.settlementCurrency.totalPayable,
    input.customsDeclared ? 1 : 0,
    input.complianceChecksRequired ? 1 : 0,
    input.insuranceRequired ? 1 : 0,
    input.remoteArea ? 1 : 0,
    input.hazardous ? 1 : 0,
    JSON.stringify(result.analytics || {}),
    JSON.stringify(result),
  ];

  await db.query(sql, params);
}

async function calculateShipmentPricing(input, userContext = null) {
  const volumetricWeight = volumetricWeightKg(
    input.lengthCm,
    input.widthCm,
    input.heightCm,
    input.transportMode
  );

  const chargeableWeight = getChargeableWeight(input.weightKg, volumetricWeight);

  const freightDetails = calculateBaseFreight({
    ...input,
    chargeableWeightKg: chargeableWeight,
  });

  const insuranceFee = calculateInsurance(input);

  const surcharges = buildSurcharges({
    ...input,
    freightBase: freightDetails.baseFreight,
  });

  const surchargeTotal = round2(
    surcharges.reduce((sum, item) => sum + Number(item.amount || 0), 0)
  );

  const customs = calculateCustoms({
    shipmentType: input.shipmentType,
    declaredValue: input.declaredValue,
    productCategory: input.productCategory,
    customsDeclared: input.customsDeclared,
  });

  const subtotalBeforePartner = round2(
    freightDetails.baseFreight + insuranceFee + surchargeTotal + customs.totalCustomsCost
  );

  const partnerAdjustment = getPartnerAdjustment({
    partnerTier: input.partnerTier,
    subtotal: subtotalBeforePartner,
    partnerId: input.partnerId || userContext?.partnerId || null,
  });

  const subtotalAfterPartner = round2(
    subtotalBeforePartner + partnerAdjustment.adjustmentAmount
  );

  const discount = calculateDiscount({
    discountCode: input.discountCode,
    subtotal: subtotalAfterPartner,
    customerType: input.customerType,
  });

  const taxableAmount = round2(Math.max(0, subtotalAfterPartner - discount.discountAmount));

  const tax = calculateTax({
    shipmentType: input.shipmentType,
    originCountry: input.originCountry,
    destinationCountry: input.destinationCountry,
    taxableAmount,
  });

  const platformFeeRate = Number(process.env.DEFAULT_PLATFORM_FEE_RATE || 0.015);
  const platformFee = round2(taxableAmount * platformFeeRate);

  const totalBeforeCurrency = round2(taxableAmount + tax.totalTax + platformFee);

  const conversion = convertAmount(
    totalBeforeCurrency,
    input.baseCurrency,
    input.currency
  );

  const analytics = buildAnalyticsSnapshot({
    subtotalBeforeTax: taxableAmount,
    totalTax: tax.totalTax,
    totalDiscount: discount.discountAmount,
    finalAmount: totalBeforeCurrency,
    declaredValue: input.declaredValue,
  });

  const normalizedUser = normalizeUserContext(userContext);

  const result = {
    success: true,
    quoteId: buildQuoteId(),
    calculatedAt: new Date().toISOString(),
    requestedBy: userContext
      ? {
          id: normalizedUser.id,
          role: normalizedUser.role,
          partnerId: normalizedUser.partnerId,
          companyId: normalizedUser.companyId,
        }
      : null,
    shipment: {
      shipmentType: input.shipmentType,
      transportMode: input.transportMode,
      serviceLevel: input.serviceLevel,
      courier: input.courier,
      originCountry: input.originCountry,
      destinationCountry: input.destinationCountry,
      weightKg: input.weightKg,
      volumetricWeightKg: volumetricWeight,
      chargeableWeightKg: chargeableWeight,
      dimensionsCm: {
        length: input.lengthCm,
        width: input.widthCm,
        height: input.heightCm,
      },
      distanceKm: input.distanceKm,
      declaredValue: input.declaredValue,
      productCategory: input.productCategory,
      hsCode: input.hsCode,
    },
    breakdownBaseCurrency: {
      currency: input.baseCurrency,
      freight: {
        baseRatePerKm: freightDetails.baseRate,
        distanceComponent: freightDetails.distanceComponent,
        weightComponent: freightDetails.weightComponent,
        serviceLevelMultiplier: freightDetails.serviceLevelMultiplier,
        courierMultiplier: freightDetails.courierMultiplier,
        amount: freightDetails.baseFreight,
      },
      insurance: {
        applicable: input.insuranceRequired,
        amount: insuranceFee,
      },
      surcharges,
      surchargeTotal,
      customs,
      partnerAdjustment,
      discount,
      taxableAmount,
      tax,
      platformFee,
      subtotalBeforeTax: taxableAmount,
      totalTax: tax.totalTax,
      totalPayable: totalBeforeCurrency,
    },
    settlementCurrency: {
      currency: input.currency,
      exchangeRate: conversion.rate,
      provider: conversion.provider,
      asOf: conversion.asOf,
      totalPayable: conversion.amount,
    },
    compliance: {
      customsDeclared: input.customsDeclared,
      complianceChecksRequired: input.complianceChecksRequired,
      taxRegime: tax.taxRegime,
      tradeClassification: input.hsCode || 'UNSPECIFIED',
    },
    analytics,
    visibility: {
      canSeeCostModel: ['ADMIN', 'FINANCE'].includes(String(userContext?.role || '').toUpperCase()),
      canSeeMarginAnalytics: ['ADMIN', 'FINANCE'].includes(String(userContext?.role || '').toUpperCase()),
      canSeePartnerAdjustments: ['ADMIN', 'FINANCE', 'OPS'].includes(
        String(userContext?.role || '').toUpperCase()
      ),
    },
  };

  await persistQuote(result, input, normalizedUser);

  return result;
}

async function getPricingHealth() {
  let database = {
    status: 'down',
  };

  try {
    await db.ping();
    database = {
      status: 'up',
      host: process.env.DB_HOST || '127.0.0.1',
      database: process.env.DB_NAME || 'pricingservice',
    };
  } catch (error) {
    database = {
      status: 'down',
      message: error.message,
    };
  }

  return {
    service: process.env.PRICING_SERVICE_NAME || 'pricingservice',
    version: process.env.PRICING_SERVICE_VERSION || '1.0.0',
    status: database.status === 'up' ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    database,
  };
}

module.exports = {
  calculateShipmentPricing,
  getPricingHealth,
};