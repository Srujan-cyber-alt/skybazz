'use strict';

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
  const baseFreight = round2((distanceComponent + weightComponent) * serviceLevelMultiplier * courierMultiplier);

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

  const subtotalAfterPartner = round2(subtotalBeforePartner + partnerAdjustment.adjustmentAmount);

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

  const totalBeforeCurrency = round2(
    taxableAmount + tax.totalTax + platformFee
  );

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

  return {
    success: true,
    quoteId: `quote_${Date.now()}`,
    calculatedAt: new Date().toISOString(),
    requestedBy: userContext
      ? {
          id: userContext.id || null,
          role: userContext.role || null,
          partnerId: userContext.partnerId || null,
          companyId: userContext.companyId || null,
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
      canSeePartnerAdjustments: ['ADMIN', 'FINANCE', 'OPS'].includes(String(userContext?.role || '').toUpperCase()),
    },
  };
}

function getPricingHealth() {
  return {
    service: process.env.PRICING_SERVICE_NAME || 'pricingservice',
    version: process.env.PRICING_SERVICE_VERSION || '1.0.0',
    status: 'ok',
    timestamp: new Date().toISOString(),
  };
}

module.exports = {
  calculateShipmentPricing,
  getPricingHealth,
};