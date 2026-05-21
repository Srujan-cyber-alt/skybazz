'use strict';

const INTERNAL_RATES = {
  USD: 1,
  EUR: 0.92,
  INR: 83.2,
  AED: 3.67,
  GBP: 0.79,
  JPY: 156.4,
  SGD: 1.35,
  CAD: 1.36,
  AUD: 1.51,
};

function normalizeCurrency(currency) {
  return String(currency || '').trim().toUpperCase();
}

function getRate(baseCurrency, targetCurrency) {
  const base = normalizeCurrency(baseCurrency);
  const target = normalizeCurrency(targetCurrency);

  if (!INTERNAL_RATES[base]) {
    throw new Error(`Unsupported base currency: ${base}`);
  }

  if (!INTERNAL_RATES[target]) {
    throw new Error(`Unsupported target currency: ${target}`);
  }

  const usdAmountOfBase = 1 / INTERNAL_RATES[base];
  const targetPerBase = usdAmountOfBase * INTERNAL_RATES[target];

  return Number(targetPerBase.toFixed(6));
}

function convertAmount(amount, baseCurrency, targetCurrency) {
  const numericAmount = Number(amount || 0);
  const rate = getRate(baseCurrency, targetCurrency);

  return {
    amount: Number((numericAmount * rate).toFixed(2)),
    rate,
    baseCurrency: normalizeCurrency(baseCurrency),
    targetCurrency: normalizeCurrency(targetCurrency),
    provider: process.env.EXCHANGE_RATE_PROVIDER || 'internal',
    asOf: new Date().toISOString(),
  };
}

module.exports = {
  getRate,
  convertAmount,
};