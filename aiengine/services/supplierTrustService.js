// services/supplierTrustService.js
import { pool } from '../db.js';

function clamp(value, min, max) {
  const n = Number(value);
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

// Internal: compute raw stats (averages + approvals) for a supplier
async function computeSupplierStats(supplierName) {
  if (!supplierName) {
    return {
      avgDelivery: null,
      avgQuality: null,
      approvedSelections: 0,
    };
  }

  const name = supplierName.trim();
  if (!name) {
    return {
      avgDelivery: null,
      avgQuality: null,
      approvedSelections: 0,
    };
  }

  const [rows] = await pool.execute(
    `
    SELECT
      request_id,
      specs_json
    FROM request_requirements
    WHERE specs_json IS NOT NULL
    `
  );

  let totalDelivery = 0;
  let deliverySamples = 0;
  let totalQuality = 0;
  let qualitySamples = 0;
  let approvedSelections = 0;

  for (const row of rows) {
    let specs = null;
    if (!row.specs_json) continue;

    if (typeof row.specs_json === 'string') {
      try {
        specs = JSON.parse(row.specs_json);
      } catch {
        continue;
      }
    } else {
      specs = row.specs_json;
    }

    const quotes = Array.isArray(specs.quotes) ? specs.quotes : [];
    const chosenSupplier = specs.chosenSupplier ?? null;
    const chosenSupplierApproved = !!specs.chosenSupplierApproved;

    for (const q of quotes) {
      const qName = (q.supplierName || '').trim();
      if (!qName || qName.toLowerCase() !== name.toLowerCase()) continue;

      const dRating = q.deliveryRating != null ? Number(q.deliveryRating) : NaN;
      if (!Number.isNaN(dRating) && dRating >= 1 && dRating <= 5) {
        totalDelivery += dRating;
        deliverySamples += 1;
      }

      const qRating = q.qualityRating != null ? Number(q.qualityRating) : NaN;
      if (!Number.isNaN(qRating) && qRating >= 1 && qRating <= 5) {
        totalQuality += qRating;
        qualitySamples += 1;
      }

      if (
        chosenSupplier &&
        chosenSupplierApproved &&
        (chosenSupplier || '').trim().toLowerCase() === name.toLowerCase()
      ) {
        approvedSelections += 1;
      }
    }
  }

  const avgDelivery = deliverySamples > 0 ? totalDelivery / deliverySamples : null;
  const avgQuality = qualitySamples > 0 ? totalQuality / qualitySamples : null;

  return {
    avgDelivery,
    avgQuality,
    approvedSelections,
  };
}

// Map supplier stats to a 0–100 trust score
export async function getSupplierTrustScore(supplierName) {
  const { avgDelivery, avgQuality, approvedSelections } = await computeSupplierStats(
    supplierName
  );

  // Convert 1–5 ratings to 0–100
  const deliveryScore =
    avgDelivery != null ? clamp((avgDelivery / 5) * 100, 0, 100) : 50;
  const qualityScore =
    avgQuality != null ? clamp((avgQuality / 5) * 100, 0, 100) : 50;

  // Reward suppliers with more approved selections (up to +20)
  const approvalsBonus = clamp(approvedSelections * 5, 0, 20);

  const baseTrust = 0.4 * deliveryScore + 0.4 * qualityScore + 0.2 * 60; // 60 baseline
  const finalTrust = clamp(baseTrust + approvalsBonus, 0, 100);

  return finalTrust;
}

// NEW: expose trust components so recommendation can show perf(del,qual,apps)
export async function getSupplierTrustComponents(supplierName) {
  const { avgDelivery, avgQuality, approvedSelections } = await computeSupplierStats(
    supplierName
  );

  const deliveryScore =
    avgDelivery != null ? clamp((avgDelivery / 5) * 100, 0, 100) : 50;
  const qualityScore =
    avgQuality != null ? clamp((avgQuality / 5) * 100, 0, 100) : 50;
  const approvalsBonus = clamp(approvedSelections * 5, 0, 20);

  const baseTrust = 0.4 * deliveryScore + 0.4 * qualityScore + 0.2 * 60;
  const finalTrust = clamp(baseTrust + approvalsBonus, 0, 100);

  return {
    trust: finalTrust,
    avgDelivery,
    avgQuality,
    approvedSelections,
  };
}