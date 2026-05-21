'use strict';

function round2(value) {
  return Number(Number(value || 0).toFixed(2));
}

function calculateCustoms(payload) {
  const {
    shipmentType,
    declaredValue,
    productCategory,
    customsDeclared,
  } = payload;

  if (shipmentType !== 'INTERNATIONAL' || !customsDeclared) {
    return {
      applicable: false,
      dutyRate: 0,
      customsDuty: 0,
      customsClearanceFee: 0,
      documentationFee: 0,
      totalCustomsCost: 0,
    };
  }

  let dutyRate = 0.05;

  if (productCategory === 'ELECTRONICS') dutyRate = 0.12;
  if (productCategory === 'LUXURY') dutyRate = 0.18;
  if (productCategory === 'FOOD') dutyRate = 0.08;
  if (productCategory === 'INDUSTRIAL') dutyRate = 0.1;

  const customsDuty = round2(declaredValue * dutyRate);
  const customsClearanceFee = round2(Number(process.env.DEFAULT_CUSTOMS_CLEARANCE_FEE || 25));
  const documentationFee = round2(10);

  return {
    applicable: true,
    dutyRate,
    customsDuty,
    customsClearanceFee,
    documentationFee,
    totalCustomsCost: round2(customsDuty + customsClearanceFee + documentationFee),
  };
}

module.exports = {
  calculateCustoms,
};