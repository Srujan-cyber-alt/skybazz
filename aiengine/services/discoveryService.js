import { pool } from '../db.js';

// Save one discovery result for a request
export async function insertDiscoveryResult({
  requestId,
  supplierId,
  source,
  url,
  title,
  snippet,
  rawData,
}) {
  const rawJson = rawData ? JSON.stringify(rawData) : null;

  const [result] = await pool.execute(
    `INSERT INTO discovery_results
     (request_id, supplier_id, source, url, title, snippet, raw_data_json)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [requestId, supplierId || null, source, url, title, snippet, rawJson]
  );

  return result.insertId;
}

// Save or update a supplier
export async function insertSupplier({
  name,
  website,
  country,
  contactEmail,
  contactPhone,
  legalEntityName,
  taxId,
}) {
  const [result] = await pool.execute(
    `INSERT INTO suppliers
     (name, website, country, contact_email, contact_phone, legal_entity_name, tax_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      name,
      website || null,
      country || null,
      contactEmail || null,
      contactPhone || null,
      legalEntityName || null,
      taxId || null,
    ]
  );

  return result.insertId;
}

// Save a supplier score
export async function insertSupplierScore({
  supplierId,
  requestId,
  trustScore,
  relevanceScore,
  priceLevel,
  dataSource,
}) {
  const [result] = await pool.execute(
    `INSERT INTO supplier_scores
     (supplier_id, request_id, trust_score, relevance_score, price_level, data_source)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      supplierId,
      requestId || null,
      trustScore,
      relevanceScore,
      priceLevel || null,
      dataSource || 'heuristics_v1',
    ]
  );

  return result.insertId;
}

// Simple Supplier Trust / Verification v0
export async function evaluateSupplierTrustForRequest({ supplierId, requestId }) {
  let trustScore = 50;
  let relevanceScore = 50;
  let priceLevel = 'unknown';

  const [rows] = await pool.execute(
    `SELECT
       s.country,
       dr.raw_data_json
     FROM suppliers s
     JOIN discovery_results dr ON dr.request_id = ?
     WHERE s.id = ?
     LIMIT 1`,
    [requestId, supplierId]
  );

  if (rows.length > 0) {
    const row = rows[0];

    if (row.country === 'India') {
      trustScore += 10;
    }

    let rawData = null;
    if (row.raw_data_json) {
      if (typeof row.raw_data_json === 'string') {
        try {
          rawData = JSON.parse(row.raw_data_json);
        } catch {
          rawData = null;
        }
      } else {
        rawData = row.raw_data_json;
      }
    }

    if (rawData) {
      if (rawData.min_order_quantity && rawData.min_order_quantity <= 100) {
        trustScore += 10;
        relevanceScore += 10;
      }

      if (rawData.indicative_price_per_unit_in_inr) {
        const price = rawData.indicative_price_per_unit_in_inr;
        if (price < 40000) {
          priceLevel = 'low';
        } else if (price <= 60000) {
          priceLevel = 'medium';
        } else {
          priceLevel = 'high';
        }
      }
    }
  }

  if (trustScore > 100) trustScore = 100;
  if (trustScore < 0) trustScore = 0;
  if (relevanceScore > 100) relevanceScore = 100;
  if (relevanceScore < 0) relevanceScore = 0;

  const scoreId = await insertSupplierScore({
    supplierId,
    requestId,
    trustScore,
    relevanceScore,
    priceLevel,
    dataSource: 'trust_v0',
  });

  return { scoreId, trustScore, relevanceScore, priceLevel };
}

// Seed two example suppliers + discovery + score for a given request
export async function seedExampleDiscoveryForRequest(requestId) {
  // Supplier 1: Mysuru Tech Supplies
  const supplierId1 = await insertSupplier({
    name: 'Mysuru Tech Supplies',
    website: 'https://example-supplier.com',
    country: 'India',
    contactEmail: 'sales@example-supplier.com',
    contactPhone: '+91-90000-00000',
    legalEntityName: 'Mysuru Tech Supplies Pvt Ltd',
    taxId: 'GSTIN-29ABCDE1234F1Z5',
  });

  const discoveryId1 = await insertDiscoveryResult({
    requestId,
    supplierId: supplierId1,
    source: 'manual_seed',
    url: 'https://example-supplier.com/products/gaming-laptops',
    title: 'Gaming Laptops – Mysuru Tech Supplies',
    snippet: 'Supplier offering bulk gaming laptops with India-wide shipping.',
    rawData: {
      indicative_price_per_unit_in_inr: 50000,
      min_order_quantity: 100,
      ships_to: ['India'],
    },
  });

  const scoreId1 = await insertSupplierScore({
    supplierId: supplierId1,
    requestId,
    trustScore: 80.0,
    relevanceScore: 90.0,
    priceLevel: 'medium',
    dataSource: 'seed_v0',
  });

  // Supplier 2: Hyderabad Gaming Systems
  const supplierId2 = await insertSupplier({
    name: 'Hyderabad Gaming Systems',
    website: 'https://example-hgs.com',
    country: 'India',
    contactEmail: 'sales@example-hgs.com',
    contactPhone: '+91-91000-00000',
    legalEntityName: 'Hyderabad Gaming Systems Pvt Ltd',
    taxId: 'GSTIN-36ABCDE5678F1Z9',
  });

  const discoveryId2 = await insertDiscoveryResult({
    requestId,
    supplierId: supplierId2,
    source: 'manual_seed',
    url: 'https://example-hgs.com/bulk/gaming-laptops',
    title: 'Bulk Gaming Laptops – Hyderabad Gaming Systems',
    snippet: 'Bulk gaming laptops with flexible MOQs and multi-country shipping.',
    rawData: {
      indicative_price_per_unit_in_inr: 55000,
      min_order_quantity: 50,
      ships_to: ['India', 'UAE'],
    },
  });

  const scoreId2 = await insertSupplierScore({
    supplierId: supplierId2,
    requestId,
    trustScore: 75.0,
    relevanceScore: 85.0,
    priceLevel: 'medium',
    dataSource: 'seed_v0',
  });

  return {
    suppliers: [
      { supplierId: supplierId1, discoveryId: discoveryId1, scoreId: scoreId1 },
      { supplierId: supplierId2, discoveryId: discoveryId2, scoreId: scoreId2 },
    ],
  };
}

function chooseBetterRow(existing, candidate) {
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

function dedupeBySupplier(items) {
  const map = new Map();

  for (const item of items) {
    const supplierId = item.supplier?.id;
    if (!supplierId) continue;

    if (!map.has(supplierId)) {
      map.set(supplierId, item);
    } else {
      const best = chooseBetterRow(map.get(supplierId), item);
      map.set(supplierId, best);
    }
  }

  return [...map.values()];
}

// Fetch candidates for a given request (Product Discovery Agent v0)
export async function getCandidatesForRequest(requestId) {
  const [rows] = await pool.execute(
    `SELECT
       dr.id              AS discovery_id,
       dr.url             AS url,
       dr.title           AS title,
       dr.snippet         AS snippet,
       dr.raw_data_json   AS raw_data_json,
       s.id               AS supplier_id,
       s.name             AS supplier_name,
       s.website          AS supplier_website,
       s.country          AS supplier_country,
       s.contact_email    AS supplier_email,
       s.contact_phone    AS supplier_phone,
       ss.trust_score     AS trust_score,
       ss.relevance_score AS relevance_score,
       ss.price_level     AS price_level
     FROM discovery_results dr
     LEFT JOIN suppliers s
       ON s.id = dr.supplier_id
     LEFT JOIN supplier_scores ss
       ON ss.supplier_id = s.id
      AND (ss.request_id IS NULL OR ss.request_id = dr.request_id)
     WHERE dr.request_id = ?
     ORDER BY ss.relevance_score DESC, ss.trust_score DESC`,
    [requestId]
  );

  const mapped = rows.map(row => {
    let rawData = null;

    if (row.raw_data_json != null) {
      if (typeof row.raw_data_json === 'string') {
        try {
          rawData = JSON.parse(row.raw_data_json);
        } catch {
          rawData = null;
        }
      } else {
        rawData = row.raw_data_json;
      }
    }

    return {
      discoveryId: row.discovery_id,
      url: row.url,
      title: row.title,
      snippet: row.snippet,
      rawData,
      supplier: {
        id: row.supplier_id,
        name: row.supplier_name,
        website: row.supplier_website,
        country: row.supplier_country,
        email: row.supplier_email,
        phone: row.supplier_phone,
      },
      scores: {
        trust: row.trust_score != null ? Number(row.trust_score) : 0,
        relevance: row.relevance_score != null ? Number(row.relevance_score) : 0,
        priceLevel: row.price_level || null,
      },
    };
  });

  return dedupeBySupplier(mapped);
}