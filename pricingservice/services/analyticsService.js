'use strict';

function round2(value) {
  return Number(Number(value || 0).toFixed(2));
}

function buildAnalyticsSnapshot(payload) {
  const {
    subtotalBeforeTax,
    totalTax,
    totalDiscount,
    finalAmount,
    declaredValue,
  } = payload;

  const configuredMarginRate = Number(process.env.DEFAULT_MARGIN_RATE || 0.14);
  const estimatedCostBase = round2(subtotalBeforeTax * (1 - configuredMarginRate));
  const estimatedMarginAmount = round2(subtotalBeforeTax - estimatedCostBase);
  const estimatedMarginRate = subtotalBeforeTax > 0
    ? round2(estimatedMarginAmount / subtotalBeforeTax)
    : 0;

  return {
    revenueBaseCurrency: round2(finalAmount),
    subtotalBeforeTax: round2(subtotalBeforeTax),
    totalTax: round2(totalTax),
    totalDiscount: round2(totalDiscount),
    declaredValue: round2(declaredValue),
    estimatedCostBase,
    estimatedMarginAmount,
    estimatedMarginRate,
  };
}

module.exports = {
  buildAnalyticsSnapshot,
};