'use strict';

function round2(value) {
  return Number(Number(value || 0).toFixed(2));
}

function calculateDiscount(payload) {
  const { discountCode, subtotal, customerType } = payload;

  if (!discountCode) {
    return {
      code: null,
      type: null,
      discountAmount: 0,
      description: null,
    };
  }

  const code = String(discountCode).toUpperCase();

  if (code === 'WELCOME10') {
    return {
      code,
      type: 'PERCENTAGE',
      discountAmount: round2(subtotal * 0.1),
      description: '10% onboarding discount',
    };
  }

  if (code === 'FREIGHT50') {
    return {
      code,
      type: 'FIXED',
      discountAmount: round2(Math.min(50, subtotal)),
      description: 'Fixed freight discount',
    };
  }

  if (code === 'ENTERPRISE15' && customerType === 'ENTERPRISE') {
    return {
      code,
      type: 'PERCENTAGE',
      discountAmount: round2(subtotal * 0.15),
      description: 'Enterprise contract discount',
    };
  }

  return {
    code,
    type: 'INVALID',
    discountAmount: 0,
    description: 'Invalid or ineligible discount code',
  };
}

module.exports = {
  calculateDiscount,
};