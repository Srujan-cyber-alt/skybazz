'use strict';

function round2(value) {
  return Number(Number(value || 0).toFixed(2));
}

function getPartnerAdjustment(payload) {
  const { partnerTier, subtotal, partnerId } = payload;

  let adjustmentRate = 0;
  let label = 'Standard pricing';

  if (partnerTier === 'PREFERRED') {
    adjustmentRate = -0.05;
    label = 'Preferred partner pricing';
  }

  if (partnerTier === 'ENTERPRISE') {
    adjustmentRate = -0.1;
    label = 'Enterprise partner pricing';
  }

  if (partnerId && String(partnerId).toUpperCase().startsWith('VIP')) {
    adjustmentRate -= 0.02;
    label = 'VIP enterprise partner pricing';
  }

  const adjustmentAmount = round2(subtotal * adjustmentRate);

  return {
    partnerTier,
    partnerId: partnerId || null,
    adjustmentRate,
    adjustmentAmount,
    label,
  };
}

module.exports = {
  getPartnerAdjustment,
};