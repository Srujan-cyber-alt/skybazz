import { pool } from '../db.js';
import { getCandidatesForRequest } from '../services/discoveryService.js';
import { buildQuotationForRequest } from '../services/quotationService.js';
import { buildLogisticsEstimateForQuotation } from '../services/logisticsService.js';

function normalizeSupplierName(value) {
  if (typeof value !== 'string') return null;

  const normalized = value
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) return null;

  return normalized;
}

function isBlockedSupplierPlaceholder(value) {
  if (!value) return true;

  const lowered = value.toLowerCase();

  const blocked = new Set([
    'name',
    'supplier',
    'supplier name',
    'test',
    'unknown',
    'n/a',
    'na',
    '-',
  ]);

  return blocked.has(lowered);
}

function getValidSupplierName(value) {
  const normalized = normalizeSupplierName(value);
  if (!normalized) return null;
  if (isBlockedSupplierPlaceholder(normalized)) return null;
  return normalized;
}

/**
 * Helper: load aggregated supplier stats so we can enrich recommendations
 * with delivery, quality, and approvals per supplier.
 */
async function getSupplierStatsMap() {
  const [rows] = await pool.execute(
    `
    SELECT
      request_id,
      specs_json
    FROM request_requirements
    WHERE specs_json IS NOT NULL
    `
  );

  const statsMap = new Map();

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
    const chosenSupplier = getValidSupplierName(specs.chosenSupplier ?? null);
    const chosenSupplierApproved = !!specs.chosenSupplierApproved;

    for (const q of quotes) {
      const name = getValidSupplierName(q.supplierName);
      if (!name) continue;

      const key = name.toLowerCase();

      if (!statsMap.has(key)) {
        statsMap.set(key, {
          supplierName: name,
          quoteCount: 0,
          totalDeliveryRating: 0,
          deliverySamples: 0,
          totalQualityRating: 0,
          qualitySamples: 0,
          approvedSelectionCount: 0,
        });
      }

      const entry = statsMap.get(key);
      entry.quoteCount += 1;

      const dRating = q.deliveryRating != null ? Number(q.deliveryRating) : NaN;
      if (!Number.isNaN(dRating) && dRating >= 1 && dRating <= 5) {
        entry.totalDeliveryRating += dRating;
        entry.deliverySamples += 1;
      }

      const qRating = q.qualityRating != null ? Number(q.qualityRating) : NaN;
      if (!Number.isNaN(qRating) && qRating >= 1 && qRating <= 5) {
        entry.totalQualityRating += qRating;
        entry.qualitySamples += 1;
      }

      if (
        chosenSupplier &&
        chosenSupplierApproved &&
        chosenSupplier.toLowerCase() === key
      ) {
        entry.approvedSelectionCount += 1;
      }
    }
  }

  for (const [, entry] of statsMap.entries()) {
    entry.averageDeliveryRating =
      entry.deliverySamples > 0 ? entry.totalDeliveryRating / entry.deliverySamples : null;
    entry.averageQualityRating =
      entry.qualitySamples > 0 ? entry.totalQualityRating / entry.qualitySamples : null;
  }

  return statsMap;
}

function computeActions(status) {
  switch (status) {
    case 'open':
      return { canQuote: true, canClose: false, canReopen: false };
    case 'quoted':
      return { canQuote: false, canClose: true, canReopen: false };
    case 'closed':
      return { canQuote: false, canClose: false, canReopen: true };
    default:
      return { canQuote: false, canClose: false, canReopen: false };
  }
}

function validateCreateRequestBody(body) {
  const errors = [];

  if (!body.title || typeof body.title !== 'string' || body.title.trim().length === 0) {
    errors.push('title is required');
  }

  if (body.quantity !== undefined) {
    const q = Number(body.quantity);
    if (Number.isNaN(q) || q <= 0) {
      errors.push('quantity must be a positive number');
    }
  }

  if (body.currency && typeof body.currency === 'string') {
    const allowedCurrencies = ['INR', 'USD', 'EUR'];
    if (!allowedCurrencies.includes(body.currency)) {
      errors.push(`currency must be one of: ${allowedCurrencies.join(', ')}`);
    }
  }

  if (body.status && typeof body.status === 'string') {
    const allowedStatus = ['open', 'quoted', 'closed'];
    if (!allowedStatus.includes(body.status)) {
      errors.push(`status must be one of: ${allowedStatus.join(', ')}`);
    }
  }

  return errors;
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
       rr.budget_min,
       rr.budget_max,
       rr.currency,
       rr.destination_country,
       rr.urgency,
       rr.status,
       rr.notes,
       rr.created_at,
       rr.updated_at,
       rr.quoted_at,
       rr.closed_at
     FROM request_requirements rr
     WHERE rr.request_id = ?
     LIMIT 1`,
    [requestId]
  );

  if (rows.length === 0) return null;

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
    budgetMin: row.budget_min,
    budgetMax: row.budget_max,
    currency: row.currency,
    destinationCountry: row.destination_country,
    urgency: row.urgency,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    quotedAt: row.quoted_at,
    closedAt: row.closed_at,
    actions: computeActions(row.status),
  };
}

async function appendQuoteToRequest(requestId, quote) {
  const [rows] = await pool.execute(
    `SELECT specs_json
     FROM request_requirements
     WHERE request_id = ?
     LIMIT 1`,
    [requestId]
  );

  if (rows.length === 0) return false;

  let specs = null;
  const row = rows[0];

  if (row.specs_json) {
    if (typeof row.specs_json === 'string') {
      try {
        specs = JSON.parse(row.specs_json);
      } catch {
        specs = { raw: '' };
      }
    } else {
      specs = row.specs_json;
    }
  } else {
    specs = { raw: '' };
  }

  if (!Array.isArray(specs.quotes)) specs.quotes = [];
  specs.quotes.push(quote);

  await pool.execute(
    `UPDATE request_requirements
     SET specs_json = ?, updated_at = CURRENT_TIMESTAMP
     WHERE request_id = ?`,
    [JSON.stringify(specs), requestId]
  );

  return true;
}

async function updateChosenSupplier(requestId, supplierName) {
  const [rows] = await pool.execute(
    `SELECT specs_json
     FROM request_requirements
     WHERE request_id = ?
     LIMIT 1`,
    [requestId]
  );

  if (rows.length === 0) return false;

  let specs = null;
  const row = rows[0];

  if (row.specs_json) {
    if (typeof row.specs_json === 'string') {
      try {
        specs = JSON.parse(row.specs_json);
      } catch {
        specs = { raw: '' };
      }
    } else {
      specs = row.specs_json;
    }
  } else {
    specs = { raw: '' };
  }

  specs.chosenSupplier = supplierName;

  await pool.execute(
    `UPDATE request_requirements
     SET specs_json = ?, updated_at = CURRENT_TIMESTAMP
     WHERE request_id = ?`,
    [JSON.stringify(specs), requestId]
  );

  return true;
}

async function updateChosenSupplierApproval(requestId, approved) {
  const [rows] = await pool.execute(
    `SELECT specs_json
     FROM request_requirements
     WHERE request_id = ?
     LIMIT 1`,
    [requestId]
  );

  if (rows.length === 0) return false;

  let specs = null;
  const row = rows[0];

  if (row.specs_json) {
    if (typeof row.specs_json === 'string') {
      try {
        specs = JSON.parse(row.specs_json);
      } catch {
        specs = { raw: '' };
      }
    } else {
      specs = row.specs_json;
    }
  } else {
    specs = { raw: '' };
  }

  specs.chosenSupplierApproved = !!approved;

  await pool.execute(
    `UPDATE request_requirements
     SET specs_json = ?, updated_at = CURRENT_TIMESTAMP
     WHERE request_id = ?`,
    [JSON.stringify(specs), requestId]
  );

  return true;
}

async function updateQuotePerformanceInSpecs(requestId, quoteIndex, performance) {
  const [rows] = await pool.execute(
    `SELECT specs_json
     FROM request_requirements
     WHERE request_id = ?
     LIMIT 1`,
    [requestId]
  );

  if (rows.length === 0) return false;

  let specs = null;
  const row = rows[0];

  if (row.specs_json) {
    if (typeof row.specs_json === 'string') {
      try {
        specs = JSON.parse(row.specs_json);
      } catch {
        specs = { raw: '' };
      }
    } else {
      specs = row.specs_json;
    }
  } else {
    specs = { raw: '' };
  }

  if (!Array.isArray(specs.quotes)) return false;

  const idx = Number(quoteIndex);
  if (Number.isNaN(idx) || idx < 0 || idx >= specs.quotes.length) return false;

  const quote = specs.quotes[idx];

  if (performance.deliveryRating != null) quote.deliveryRating = performance.deliveryRating;
  if (performance.qualityRating != null) quote.qualityRating = performance.qualityRating;
  if (performance.comment != null) quote.performanceComment = performance.comment;

  await pool.execute(
    `UPDATE request_requirements
     SET specs_json = ?, updated_at = CURRENT_TIMESTAMP
     WHERE request_id = ?`,
    [JSON.stringify(specs), requestId]
  );

  return true;
}

function addRanking(items) {
  return items.map((item, index) => ({
    ...item,
    rank: index + 1,
    recommended: index === 0,
  }));
}

function normalizeScore(value, min = 0, max = 100) {
  const n = Number(value);
  if (Number.isNaN(n)) return 0;

  if (max === 100 && min === 0) {
    if (n <= 1 && n >= 0) {
      return Math.max(0, Math.min(100, n * 100));
    }
    if (n <= 5 && n >= 0) {
      return Math.max(0, Math.min(100, (n / 5) * 100));
    }
  }

  return Math.max(min, Math.min(max, n));
}

async function buildRequestSummary(requestId) {
  const request = await getRequestRequirements(requestId);
  if (!request) throw new Error('Request not found');

  const candidates = await getCandidatesForRequest(requestId);
  const quotationResult = await buildQuotationForRequest(requestId);
  const logisticsResult = await buildLogisticsEstimateForQuotation(quotationResult);

  const sortedQuotation = [...quotationResult.comparisons].sort((a, b) => {
    const aRel = a.scores?.relevance ?? 0;
    const bRel = b.scores?.relevance ?? 0;
    if (aRel !== bRel) return bRel - aRel;

    const aTrust = a.scores?.trust ?? 0;
    const bTrust = b.scores?.trust ?? 0;
    if (aTrust !== bTrust) return bTrust - aTrust;

    const aTotal = a.price?.totalPrice ?? Number.MAX_SAFE_INTEGER;
    const bTotal = b.price?.totalPrice ?? Number.MAX_SAFE_INTEGER;
    return aTotal - bTotal;
  });

  const sortedLogistics = [...logisticsResult.comparisons].sort((a, b) => {
    const aRel = a.scores?.relevance ?? 0;
    const bRel = b.scores?.relevance ?? 0;
    if (aRel !== bRel) return bRel - aRel;

    const aTrust = a.scores?.trust ?? 0;
    const bTrust = b.scores?.trust ?? 0;
    if (aTrust !== bTrust) return bTrust - aTrust;

    const aTotal = a.logistics?.totalWithLogistics ?? Number.MAX_SAFE_INTEGER;
    const bTotal = b.logistics?.totalWithLogistics ?? Number.MAX_SAFE_INTEGER;
    return aTotal - bTotal;
  });

  return {
    request,
    candidates,
    quotation: addRanking(sortedQuotation),
    logistics: addRanking(sortedLogistics),
  };
}

function computeRiskLevel(trustScore, landedCost) {
  const t = Number(trustScore);
  const c = Number(landedCost);

  if (!Number.isFinite(t) || !Number.isFinite(c)) return 'medium';

  if (t >= 80 && c <= 1_000_000) return 'low';
  if (t <= 50 && c > 10_000_000) return 'high';

  return 'medium';
}

async function buildRequestRecommendation(requestId) {
  const request = await getRequestRequirements(requestId);
  if (!request) throw new Error('Request not found');

  const quotationResult = await buildQuotationForRequest(requestId);
  const logisticsResult = await buildLogisticsEstimateForQuotation(quotationResult);

  const comparisons = logisticsResult.comparisons || [];
  if (comparisons.length === 0) {
    throw new Error('No supplier comparisons available for recommendation');
  }

  const supplierStatsMap = await getSupplierStatsMap();

  const scored = comparisons.map((item) => {
    const rawRelevance = item.scores?.relevance ?? 0;
    const rawTrust = item.scores?.trust ?? 0;

    const relevance = normalizeScore(rawRelevance);
    const trust = normalizeScore(rawTrust);
    const landedCost = Number(item.logistics?.totalWithLogistics ?? Number.MAX_SAFE_INTEGER);

    const supplierName = getValidSupplierName(item.supplier?.name || '');
    const statsKey = supplierName ? supplierName.toLowerCase() : '';
    const statsEntry = supplierStatsMap.get(statsKey);

    const perfDelivery =
      statsEntry && statsEntry.averageDeliveryRating != null
        ? statsEntry.averageDeliveryRating
        : null;
    const perfQuality =
      statsEntry && statsEntry.averageQualityRating != null
        ? statsEntry.averageQualityRating
        : null;
    const perfApprovals =
      statsEntry && statsEntry.approvedSelectionCount != null
        ? statsEntry.approvedSelectionCount
        : null;

    return {
      ...item,
      _relevance: relevance,
      _trust: trust,
      _landedCost: landedCost,
      _performance: {
        deliveryRating: perfDelivery,
        qualityRating: perfQuality,
        approvedSelections: perfApprovals,
      },
    };
  });

  const minLandedCost = Math.min(...scored.map((x) => x._landedCost));
  const maxLandedCost = Math.max(...scored.map((x) => x._landedCost));

  function computePriceScore(landedCost) {
    if (!Number.isFinite(landedCost) || !Number.isFinite(minLandedCost)) return 0;

    if (maxLandedCost === minLandedCost) {
      return 100;
    }

    const ratio = minLandedCost / landedCost;
    const rawScore = ratio * 100;

    return Math.max(0, Math.min(100, rawScore));
  }

  const WEIGHTS = {
    relevance: 0.45,
    trust: 0.35,
    price: 0.20,
  };

  const withFinalScore = scored.map((item) => {
    const priceScore = computePriceScore(item._landedCost);

    const finalScore =
      WEIGHTS.relevance * item._relevance +
      WEIGHTS.trust * item._trust +
      WEIGHTS.price * priceScore;

    const perf = item._performance || {};

    const scoreBreakdown = {
      relevance: Number(item._relevance.toFixed(2)),
      trust: Number(item._trust.toFixed(2)),
      priceScore: Number(priceScore.toFixed(2)),
      performance: {
        deliveryRating: perf.deliveryRating,
        qualityRating: perf.qualityRating,
        approvedSelections: perf.approvedSelections,
      },
      weight: {
        relevance: WEIGHTS.relevance,
        trust: WEIGHTS.trust,
        price: WEIGHTS.price,
      },
      finalScore: Number(finalScore.toFixed(2)),
      riskLevel: computeRiskLevel(item._trust, item._landedCost),
    };

    return {
      ...item,
      scores: {
        ...item.scores,
        relevance: scoreBreakdown.relevance,
        trust: scoreBreakdown.trust,
      },
      scoreBreakdown,
      finalScore: Number(finalScore.toFixed(2)),
    };
  });

  const ranked = [...withFinalScore].sort((a, b) => {
    if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;

    const aCost = a._landedCost ?? Number.MAX_SAFE_INTEGER;
    const bCost = b._landedCost ?? Number.MAX_SAFE_INTEGER;
    if (aCost !== bCost) return aCost - bCost;

    const aRel = a.scores?.relevance ?? 0;
    const bRel = b.scores?.relevance ?? 0;
    if (aRel !== bRel) return bRel - aRel;

    const aTrust = a.scores?.trust ?? 0;
    const bTrust = b.scores?.trust ?? 0;
    return bTrust - aTrust;
  });

  const best = ranked[0];
  const landedCurrency = best.price?.currency ?? request.currency ?? 'INR';

  const reasoning = [
    `Selected supplier "${best.supplier?.name ?? 'Unknown'}" as the recommended option for request "${request.title}".`,
    `Weighted score: ${best.finalScore.toFixed(2)} / 100 (risk: ${best.scoreBreakdown.riskLevel}).`,
    `Relevance: ${best.scoreBreakdown.relevance.toFixed(2)}, trust: ${best.scoreBreakdown.trust.toFixed(2)}, price score: ${best.scoreBreakdown.priceScore.toFixed(2)}.`,
    `Landed cost (product + logistics): ${best._landedCost.toFixed(2)} ${landedCurrency}.`,
    `Weights used: relevance ${Math.round(WEIGHTS.relevance * 100)}%, trust ${Math.round(WEIGHTS.trust * 100)}%, price ${Math.round(WEIGHTS.price * 100)}%.`,
    `Logistics estimates are based on destination country "${request.destinationCountry}".`,
  ].join(' ');

  return {
    request,
    recommendation: {
      supplier: best.supplier,
      price: best.price,
      logistics: best.logistics,
      scores: best.scores,
      scoreBreakdown: best.scoreBreakdown,
      finalScore: best.finalScore,
      reasoning,
    },
    ranking: ranked.map((item, index) => ({
      rank: index + 1,
      supplier: item.supplier,
      price: item.price,
      logistics: item.logistics,
      scores: item.scores,
      scoreBreakdown: item.scoreBreakdown,
      finalScore: item.finalScore,
    })),
  };
}

export async function createRequest(req, res) {
  try {
    const {
      title,
      category,
      specs,
      quantity,
      currency,
      destinationCountry,
      urgency,
      status,
      budgetMin,
      budgetMax,
      notes,
    } = req.body;

    const errors = validateCreateRequestBody(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const specsJson = specs ? JSON.stringify(specs) : JSON.stringify({ raw: title });
    const initialStatus = status || 'open';

    const [result] = await pool.execute(
      `INSERT INTO request_requirements
       (
         request_id,
         title,
         category,
         specs_json,
         quantity,
         budget_min,
         budget_max,
         currency,
         destination_country,
         urgency,
         status,
         notes,
         created_at,
         updated_at,
         quoted_at,
         closed_at
       )
       VALUES
       (
         0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL, NULL
       )`,
      [
        title || 'Untitled request',
        category || null,
        specsJson,
        quantity || 0,
        budgetMin ?? null,
        budgetMax ?? null,
        currency || 'INR',
        destinationCountry || 'India',
        urgency || 'normal',
        initialStatus,
        notes ?? null,
      ]
    );

    const insertedId = result.insertId;

    await pool.execute(
      `UPDATE request_requirements
       SET request_id = ?
       WHERE id = ?`,
      [insertedId, insertedId]
    );

    res.status(201).json({
      id: insertedId,
      requestId: insertedId,
      title,
      category,
      specs,
      quantity,
      budgetMin: budgetMin ?? null,
      budgetMax: budgetMax ?? null,
      currency: currency || 'INR',
      destinationCountry: destinationCountry || 'India',
      urgency: urgency || 'normal',
      status: initialStatus,
      notes: notes ?? null,
      actions: computeActions(initialStatus),
    });
  } catch (err) {
    console.error('Error creating request', err);
    res.status(500).json({ error: 'Failed to create request' });
  }
}

export async function updateRequest(req, res) {
  const requestId = Number(req.params.id);

  if (!requestId || Number.isNaN(requestId)) {
    return res.status(400).json({ error: 'Invalid request id' });
  }

  const {
    title,
    category,
    specs,
    quantity,
    currency,
    destinationCountry,
    urgency,
    budgetMin,
    budgetMax,
    notes,
  } = req.body;

  const setClauses = [];
  const params = [];

  if (title !== undefined) {
    setClauses.push('title = ?');
    params.push(title || 'Untitled request');
  }

  if (category !== undefined) {
    setClauses.push('category = ?');
    params.push(category || null);
  }

  if (specs !== undefined) {
    const specsJson = specs ? JSON.stringify(specs) : JSON.stringify({ raw: title });
    setClauses.push('specs_json = ?');
    params.push(specsJson);
  }

  if (quantity !== undefined) {
    const q = quantity || 0;
    setClauses.push('quantity = ?');
    params.push(q);
  }

  if (budgetMin !== undefined) {
    setClauses.push('budget_min = ?');
    params.push(budgetMin ?? null);
  }

  if (budgetMax !== undefined) {
    setClauses.push('budget_max = ?');
    params.push(budgetMax ?? null);
  }

  if (currency !== undefined) {
    setClauses.push('currency = ?');
    params.push(currency || 'INR');
  }

  if (destinationCountry !== undefined) {
    setClauses.push('destination_country = ?');
    params.push(destinationCountry || 'India');
  }

  if (urgency !== undefined) {
    setClauses.push('urgency = ?');
    params.push(urgency || 'normal');
  }

  if (notes !== undefined) {
    setClauses.push('notes = ?');
    params.push(notes ?? null);
  }

  if (setClauses.length === 0) {
    return res.status(400).json({ error: 'No updatable fields provided' });
  }

  try {
    const existing = await getRequestRequirements(requestId);
    if (!existing) {
      return res.status(404).json({ error: 'Request not found' });
    }

    await pool.execute(
      `UPDATE request_requirements
       SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE request_id = ?`,
      [...params, requestId]
    );

    const updated = await getRequestRequirements(requestId);
    return res.json(updated);
  } catch (err) {
    console.error('Error updating request', err);
    return res.status(500).json({ error: 'Failed to update request' });
  }
}

export async function getRequestSummary(req, res) {
  const requestId = Number(req.params.id);

  try {
    const summary = await buildRequestSummary(requestId);
    res.json(summary);
  } catch (err) {
    console.error('Error building request summary', err);
    res.status(404).json({ error: 'Request not found or summary failed' });
  }
}

export async function exportRequestSummary(req, res) {
  const requestId = Number(req.params.id);

  try {
    const summary = await buildRequestSummary(requestId);

    const payload = {
      generatedAt: new Date().toISOString(),
      request: summary.request,
      candidates: summary.candidates,
      quotation: summary.quotation,
      logistics: summary.logistics,
    };

    const filename = `request-${requestId}-summary.json`;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).json(payload);
  } catch (err) {
    console.error('Error exporting request summary', err);
    res.status(404).json({ error: 'Request not found or export failed' });
  }
}

export async function getRawRequest(req, res) {
  const requestId = Number(req.params.id);

  if (!requestId || Number.isNaN(requestId)) {
    return res.status(400).json({ error: 'Invalid request id' });
  }

  try {
    const request = await getRequestRequirements(requestId);

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    return res.json(request);
  } catch (err) {
    console.error('Error getting raw request', err);
    return res.status(500).json({ error: 'Failed to get request' });
  }
}

export async function addQuoteToRequest(req, res) {
  const requestId = Number(req.params.id);

  if (!requestId || Number.isNaN(requestId)) {
    return res.status(400).json({ error: 'Invalid request id' });
  }

  const { supplierName, unitPrice, currency, leadTimeDays, notes } = req.body;
  const errors = [];

  const normalizedSupplierName = getValidSupplierName(supplierName);
  if (!normalizedSupplierName) {
    errors.push('supplierName is required and must be a real supplier name');
  }

  const price = Number(unitPrice);
  if (Number.isNaN(price) || price <= 0) {
    errors.push('unitPrice must be a positive number');
  }

  if (leadTimeDays !== undefined) {
    const lead = Number(leadTimeDays);
    if (Number.isNaN(lead) || lead < 0) {
      errors.push('leadTimeDays must be a non-negative number');
    }
  }

  if (currency && typeof currency === 'string') {
    const allowedCurrencies = ['INR', 'USD', 'EUR'];
    if (!allowedCurrencies.includes(currency)) {
      errors.push(`currency must be one of: ${allowedCurrencies.join(', ')}`);
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  try {
    const existing = await getRequestRequirements(requestId);
    if (!existing) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const specs = existing.specs || {};
    const quotes = Array.isArray(specs.quotes) ? specs.quotes : [];

    const duplicateQuote = quotes.some((q) => {
      const existingName = getValidSupplierName(q.supplierName);
      return existingName && existingName.toLowerCase() === normalizedSupplierName.toLowerCase();
    });

    if (duplicateQuote) {
      return res.status(409).json({
        error: `Quote from supplier "${normalizedSupplierName}" already exists for this request`,
      });
    }

    const quote = {
      supplierName: normalizedSupplierName,
      unitPrice: price,
      currency: currency || 'INR',
      leadTimeDays: leadTimeDays !== undefined ? Number(leadTimeDays) : null,
      notes: typeof notes === 'string' ? notes.trim() || null : notes ?? null,
    };

    const ok = await appendQuoteToRequest(requestId, quote);
    if (!ok) {
      return res.status(500).json({ error: 'Failed to attach quote to request' });
    }

    const updated = await getRequestRequirements(requestId);
    return res.status(201).json({
      request: updated,
      quote,
    });
  } catch (err) {
    console.error('Error adding quote to request', err);
    return res.status(500).json({ error: 'Failed to add quote' });
  }
}

export async function getQuotesForRequest(req, res) {
  const requestId = Number(req.params.id);

  if (!requestId || Number.isNaN(requestId)) {
    return res.status(400).json({ error: 'Invalid request id' });
  }

  try {
    const request = await getRequestRequirements(requestId);
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const specs = request.specs || {};
    const quotes = Array.isArray(specs.quotes) ? specs.quotes : [];

    return res.json({
      requestId: request.requestId,
      title: request.title,
      quotes,
      chosenSupplier: specs.chosenSupplier ?? null,
      chosenSupplierApproved: specs.chosenSupplierApproved ?? false,
    });
  } catch (err) {
    console.error('Error getting quotes for request', err);
    return res.status(500).json({ error: 'Failed to get quotes' });
  }
}

export async function setChosenSupplier(req, res) {
  const requestId = Number(req.params.id);

  if (!requestId || Number.isNaN(requestId)) {
    return res.status(400).json({ error: 'Invalid request id' });
  }

  const { supplierName } = req.body;
  const errors = [];

  const normalizedSupplierName = getValidSupplierName(supplierName);
  if (!normalizedSupplierName) {
    errors.push('supplierName is required and must match a real quoted supplier');
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  try {
    const existing = await getRequestRequirements(requestId);
    if (!existing) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const specs = existing.specs || {};
    const quotes = Array.isArray(specs.quotes) ? specs.quotes : [];

    const matchedQuote = quotes.find((q) => {
      const existingName = getValidSupplierName(q.supplierName);
      return existingName && existingName.toLowerCase() === normalizedSupplierName.toLowerCase();
    });

    if (!matchedQuote) {
      return res
        .status(400)
        .json({ error: 'supplierName must match one of the existing quotes' });
    }

    const ok = await updateChosenSupplier(
      requestId,
      getValidSupplierName(matchedQuote.supplierName)
    );

    if (!ok) {
      return res.status(500).json({ error: 'Failed to set chosen supplier' });
    }

    const updated = await getRequestRequirements(requestId);
    return res.status(200).json(updated);
  } catch (err) {
    console.error('Error setting chosen supplier', err);
    return res.status(500).json({ error: 'Failed to set chosen supplier' });
  }
}

export async function approveChosenSupplier(req, res) {
  const requestId = Number(req.params.id);

  if (!requestId || Number.isNaN(requestId)) {
    return res.status(400).json({ error: 'Invalid request id' });
  }

  try {
    const existing = await getRequestRequirements(requestId);
    if (!existing) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const specs = existing.specs || {};
    const chosenSupplier = getValidSupplierName(specs.chosenSupplier ?? null);

    if (!chosenSupplier) {
      return res.status(400).json({ error: 'No chosenSupplier set to approve' });
    }

    const ok = await updateChosenSupplierApproval(requestId, true);
    if (!ok) {
      return res.status(500).json({ error: 'Failed to approve chosen supplier' });
    }

    const updated = await getRequestRequirements(requestId);
    const updatedSpecs = updated.specs || {};

    return res.json({
      requestId: updated.requestId,
      title: updated.title,
      chosenSupplier: updatedSpecs.chosenSupplier ?? null,
      chosenSupplierApproved: updatedSpecs.chosenSupplierApproved ?? false,
    });
  } catch (err) {
    console.error('Error approving chosen supplier', err);
    return res.status(500).json({ error: 'Failed to approve chosen supplier' });
  }
}

export async function updateQuotePerformance(req, res) {
  const requestId = Number(req.params.id);
  const quoteIndex = Number(req.params.quoteIndex);

  if (!requestId || Number.isNaN(requestId)) {
    return res.status(400).json({ error: 'Invalid request id' });
  }

  if (Number.isNaN(quoteIndex) || quoteIndex < 0) {
    return res.status(400).json({ error: 'Invalid quote index' });
  }

  const { deliveryRating, qualityRating, comment } = req.body;
  const errors = [];

  if (deliveryRating !== undefined) {
    const dr = Number(deliveryRating);
    if (Number.isNaN(dr) || dr < 1 || dr > 5) {
      errors.push('deliveryRating must be a number between 1 and 5');
    }
  }

  if (qualityRating !== undefined) {
    const qr = Number(qualityRating);
    if (Number.isNaN(qr) || qr < 1 || qr > 5) {
      errors.push('qualityRating must be a number between 1 and 5');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  try {
    const existing = await getRequestRequirements(requestId);
    if (!existing) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const specs = existing.specs || {};
    const quotes = Array.isArray(specs.quotes) ? specs.quotes : [];

    if (!quotes[quoteIndex]) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    const ok = await updateQuotePerformanceInSpecs(requestId, quoteIndex, {
      deliveryRating:
        deliveryRating !== undefined
          ? Number(deliveryRating)
          : quotes[quoteIndex].deliveryRating ?? null,
      qualityRating:
        qualityRating !== undefined
          ? Number(qualityRating)
          : quotes[quoteIndex].qualityRating ?? null,
      comment:
        comment !== undefined ? comment : quotes[quoteIndex].performanceComment ?? null,
    });

    if (!ok) {
      return res.status(500).json({ error: 'Failed to update quote performance' });
    }

    const updated = await getRequestRequirements(requestId);
    const updatedSpecs = updated.specs || {};
    const updatedQuotes = Array.isArray(updatedSpecs.quotes) ? updatedSpecs.quotes : [];

    return res.json({
      requestId: updated.requestId,
      title: updated.title,
      quoteIndex,
      quote: updatedQuotes[quoteIndex] ?? null,
    });
  } catch (err) {
    console.error('Error updating quote performance', err);
    return res.status(500).json({ error: 'Failed to update quote performance' });
  }
}

export async function getRequestRecommendation(req, res) {
  const requestId = Number(req.params.id);

  if (!requestId || Number.isNaN(requestId)) {
    return res.status(400).json({ error: 'Invalid request id' });
  }

  try {
    const result = await buildRequestRecommendation(requestId);
    return res.json(result);
  } catch (err) {
    console.error('Error building request recommendation', err);
    return res.status(404).json({ error: 'Request not found or recommendation failed' });
  }
}