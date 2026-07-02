import { pool } from '../db.js';
import { getCandidatesForRequest } from './discoveryService.js';
import { getSupplierTrustComponents } from './supplierTrustService.js';

function normalizeSupplierName(value) {
  if (typeof value !== 'string') return null;

  const normalized = value
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) return null;

  const lowered = normalized.toLowerCase();
  const blockedPlaceholders = new Set([
    'name',
    'supplier',
    'supplier name',
    'test',
    'unknown',
    'n/a',
    'na',
    '-',
  ]);

  if (blockedPlaceholders.has(lowered)) {
    return null;
  }

  return normalized;
}

async function getRequestRequirements(requestId) {
  const [rows] = await pool.execute(
    `SELECT
       rr.id,
       rr.request_id,
       rr.title,
       rr.category,
       rr.specs_json,
       rr.quantity,
       rr.currency,
       rr.destination_country,
       rr.urgency
     FROM request_requirements rr
     WHERE rr.request_id = ?
     LIMIT 1`,
    [requestId]
  );

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];

  let specs = null;
  if (row.specs_json) {
    if (typeof row.specs_json === 'string') {
      try {
        specs = JSON.parse(row.specs_json);
      } catch {
        specs = null;
      }
    } else {
      specs = row.specs_json;
    }
  }

  return {
    id: row.id,
    requestId: row.request_id,
    title: row.title,
    category: row.category,
    specs,
    quantity: row.quantity,
    currency: row.currency,
    destinationCountry: row.destination_country,
    urgency: row.urgency,
  };
}

function chooseBetterComparison(existing, candidate) {
  const existingRel = existing.scores?.relevance ?? 0;
  const candidateRel = candidate.scores?.relevance ?? 0;

  if (candidateRel !== existingRel) {
    return candidateRel > existingRel ? candidate : existing;
  }

  const existingTrust = existing.scores?.trust ?? 0;
  const candidateTrust = candidate.scores?.trust ?? 0;

  if (candidateTrust !== existingTrust) {
    return candidateTrust > existingTrust ? candidate : existing;
  }

  const existingTotal = existing.price?.totalPrice ?? Number.MAX_SAFE_INTEGER;
  const candidateTotal = candidate.price?.totalPrice ?? Number.MAX_SAFE_INTEGER;

  return candidateTotal < existingTotal ? candidate : existing;
}

function dedupeComparisons(items) {
  const map = new Map();

  for (const item of items) {
    const supplierId = item.supplier?.id || item.supplier?.name;
    if (!supplierId) continue;

    if (!map.has(supplierId)) {
      map.set(supplierId, item);
    } else {
      const best = chooseBetterComparison(map.get(supplierId), item);
      map.set(supplierId, best);
    }
  }

  return [...map.values()];
}

export async function buildQuotationForRequest(requestId) {
  const req = await getRequestRequirements(requestId);
  if (!req) {
    throw new Error('No requirements found for this request');
  }

  const quantity = req.quantity || 0;
  const currency = req.currency || 'INR';

  const candidates = await getCandidatesForRequest(requestId);

  const candidateComparisons = candidates.map((c) => {
    const pricePerUnit =
      c.rawData && typeof c.rawData.indicative_price_per_unit_in_inr === 'number'
        ? c.rawData.indicative_price_per_unit_in_inr
        : null;

    const totalPrice =
      pricePerUnit != null && quantity > 0
        ? pricePerUnit * quantity
        : null;

    return {
      supplier: c.supplier,
      url: c.url,
      title: c.title,
      snippet: c.snippet,
      scores: c.scores,
      price: {
        currency,
        quantity,
        pricePerUnit,
        totalPrice,
      },
      performance: {
        averageDeliveryRating: null,
        averageQualityRating: null,
        approvedSelectionCount: null,
      },
    };
  });

  const specs = req.specs || {};
  const quotes = Array.isArray(specs.quotes) ? specs.quotes : [];

  const manualComparisons = await Promise.all(
    quotes.map(async (q) => {
      const supplierName = normalizeSupplierName(q.supplierName);
      if (!supplierName) return null;

      const supplierId = supplierName.trim().toLowerCase();

      const pricePerUnit =
        typeof q.unitPrice === 'number' ? q.unitPrice : Number(q.unitPrice);

      const totalPrice =
        Number.isFinite(pricePerUnit) && quantity > 0
          ? pricePerUnit * quantity
          : pricePerUnit;

      const {
        trust,
        avgDelivery,
        avgQuality,
        approvedSelections,
      } = await getSupplierTrustComponents(supplierName);

      return {
        supplier: {
          id: supplierId,
          name: supplierName,
        },
        url: null,
        title: req.title,
        snippet: q.notes || '',
        scores: {
          relevance: 80,
          trust,
        },
        price: {
          currency: q.currency || currency,
          quantity,
          pricePerUnit,
          totalPrice,
        },
        performance: {
          averageDeliveryRating: avgDelivery,
          averageQualityRating: avgQuality,
          approvedSelectionCount: approvedSelections,
        },
      };
    })
  );

  const allComparisons = [
    ...candidateComparisons,
    ...manualComparisons.filter(Boolean),
  ];

  const ranked = dedupeComparisons(allComparisons).sort((a, b) => {
    const aRel = a.scores?.relevance ?? 0;
    const bRel = b.scores?.relevance ?? 0;
    if (aRel !== bRel) return bRel - aRel;

    const aTotal = a.price?.totalPrice ?? Number.MAX_SAFE_INTEGER;
    const bTotal = b.price?.totalPrice ?? Number.MAX_SAFE_INTEGER;
    return aTotal - bTotal;
  });

  return {
    request: req,
    comparisons: ranked,
  };
}