'use strict';

function round2(value) {
  return Number(Number(value || 0).toFixed(2));
}

function calculateTax(payload) {
  const {
    shipmentType,
    originCountry,
    destinationCountry,
    taxableAmount,
  } = payload;

  const gstRate = Number(process.env.DEFAULT_GST_RATE || 0.18);
  const vatRate = Number(process.env.DEFAULT_VAT_RATE || 0.2);

  if (shipmentType === 'DOMESTIC' && originCountry === 'IN' && destinationCountry === 'IN') {
    const cgst = round2((taxableAmount * gstRate) / 2);
    const sgst = round2((taxableAmount * gstRate) / 2);

    return {
      taxRegime: 'GST',
      rates: {
        cgstRate: gstRate / 2,
        sgstRate: gstRate / 2,
        igstRate: 0,
        vatRate: 0,
      },
      components: {
        cgst,
        sgst,
        igst: 0,
        vat: 0,
      },
      totalTax: round2(cgst + sgst),
    };
  }

  if (shipmentType === 'INTERNATIONAL') {
    const vat = round2(taxableAmount * vatRate);

    return {
      taxRegime: 'VAT',
      rates: {
        cgstRate: 0,
        sgstRate: 0,
        igstRate: 0,
        vatRate,
      },
      components: {
        cgst: 0,
        sgst: 0,
        igst: 0,
        vat,
      },
      totalTax: round2(vat),
    };
  }

  return {
    taxRegime: 'NONE',
    rates: {
      cgstRate: 0,
      sgstRate: 0,
      igstRate: 0,
      vatRate: 0,
    },
    components: {
      cgst: 0,
      sgst: 0,
      igst: 0,
      vat: 0,
    },
    totalTax: 0,
  };
}

module.exports = {
  calculateTax,
};