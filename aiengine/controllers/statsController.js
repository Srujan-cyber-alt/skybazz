import { pool } from '../db.js';

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

// GET /api/stats/requests
export async function getRequestStats(req, res) {
  try {
    const [countRows] = await pool.execute(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) AS openCount,
        SUM(CASE WHEN status = 'quoted' THEN 1 ELSE 0 END) AS quotedCount,
        SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) AS closedCount
      FROM request_requirements
    `);

    const countsRow = countRows[0] || {};
    const counts = {
      total: countsRow.total ?? 0,
      open: countsRow.openCount ?? 0,
      quoted: countsRow.quotedCount ?? 0,
      closed: countsRow.closedCount ?? 0,
    };

    const [openToQuotedRows] = await pool.execute(`
      SELECT
        AVG(TIMESTAMPDIFF(SECOND, created_at, quoted_at)) AS avgSeconds
      FROM request_requirements
      WHERE quoted_at IS NOT NULL
        AND created_at IS NOT NULL
    `);

    const openToQuotedSeconds = openToQuotedRows[0]?.avgSeconds ?? null;
    const openToQuotedAvgDays =
      openToQuotedSeconds != null ? openToQuotedSeconds / 86400 : null;

    const [quotedToClosedRows] = await pool.execute(`
      SELECT
        AVG(TIMESTAMPDIFF(SECOND, quoted_at, closed_at)) AS avgSeconds
      FROM request_requirements
      WHERE quoted_at IS NOT NULL
        AND closed_at IS NOT NULL
    `);

    const quotedToClosedSeconds = quotedToClosedRows[0]?.avgSeconds ?? null;
    const quotedToClosedAvgDays =
      quotedToClosedSeconds != null ? quotedToClosedSeconds / 86400 : null;

    return res.json({
      counts,
      cycleTimes: {
        openToQuotedAvgDays,
        quotedToClosedAvgDays,
      },
    });
  } catch (err) {
    console.error('Error computing request stats', err);
    return res.status(500).json({ error: 'Failed to compute stats' });
  }
}

// GET /api/stats/suppliers
export async function getSupplierStats(req, res) {
  try {
    const [rows] = await pool.execute(`
      SELECT
        request_id,
        specs_json
      FROM request_requirements
      WHERE specs_json IS NOT NULL
    `);

    const statsMap = new Map();
    const rfqSetPerSupplier = new Map();

    for (const row of rows) {
      const requestId = row.request_id;
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
      const chosenSupplierRaw = specs.chosenSupplier ?? null;
      const chosenSupplier = normalizeSupplierName(chosenSupplierRaw);
      const chosenSupplierApproved = !!specs.chosenSupplierApproved;

      for (const q of quotes) {
        const supplierName = normalizeSupplierName(q.supplierName);
        if (!supplierName) continue;

        const supplierKey = supplierName.toLowerCase();

        if (!statsMap.has(supplierKey)) {
          statsMap.set(supplierKey, {
            supplierName,
            quoteCount: 0,
            totalUnitPrice: 0,
            priceSamples: 0,
            totalDeliveryRating: 0,
            deliverySamples: 0,
            totalQualityRating: 0,
            qualitySamples: 0,
            approvedSelectionCount: 0,
            rfqParticipationCount: 0,
          });
        }

        if (!rfqSetPerSupplier.has(supplierKey)) {
          rfqSetPerSupplier.set(supplierKey, new Set());
        }
        rfqSetPerSupplier.get(supplierKey).add(requestId);

        const entry = statsMap.get(supplierKey);
        entry.quoteCount += 1;

        const price = Number(q.unitPrice);
        if (!Number.isNaN(price) && price > 0) {
          entry.totalUnitPrice += price;
          entry.priceSamples += 1;
        }

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
          chosenSupplier.toLowerCase() === supplierKey
        ) {
          entry.approvedSelectionCount += 1;
        }
      }
    }

    for (const [supplierKey, rfqSet] of rfqSetPerSupplier.entries()) {
      const entry = statsMap.get(supplierKey);
      if (entry) {
        entry.rfqParticipationCount = rfqSet.size;
      }
    }

    const totalRfqs = new Set(rows.map((r) => r.request_id)).size || 0;

    const suppliers = Array.from(statsMap.values()).map((entry) => ({
      supplierName: entry.supplierName,
      quoteCount: entry.quoteCount,
      averageUnitPrice:
        entry.priceSamples > 0 ? entry.totalUnitPrice / entry.priceSamples : null,
      averageDeliveryRating:
        entry.deliverySamples > 0
          ? entry.totalDeliveryRating / entry.deliverySamples
          : null,
      averageQualityRating:
        entry.qualitySamples > 0
          ? entry.totalQualityRating / entry.qualitySamples
          : null,
      approvedSelectionCount: entry.approvedSelectionCount,
      rfqParticipationCount: entry.rfqParticipationCount,
      rfqParticipationShare:
        totalRfqs > 0 ? entry.rfqParticipationCount / totalRfqs : null,
    }));

    suppliers.sort((a, b) => {
      const aScore = (a.averageDeliveryRating || 0) + (a.averageQualityRating || 0);
      const bScore = (b.averageDeliveryRating || 0) + (b.averageQualityRating || 0);
      if (aScore !== bScore) return bScore - aScore;

      return (b.approvedSelectionCount || 0) - (a.approvedSelectionCount || 0);
    });

    return res.json({ suppliers });
  } catch (err) {
    console.error('Error computing supplier stats', err);
    return res.status(500).json({ error: 'Failed to compute supplier stats' });
  }
}