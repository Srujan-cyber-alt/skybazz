// controllers/quotationController.js
import { buildQuotationForRequest } from '../services/quotationService.js';

// Helper: parse numeric query param safely
function parseNumber(value, defaultValue = null) {
  if (value === undefined || value === null) return defaultValue;
  const n = Number(value);
  return Number.isNaN(n) ? defaultValue : n;
}

// Add rank + recommended
function addRanking(items) {
  return items.map((item, index) => ({
    ...item,
    rank: index + 1,
    recommended: index === 0,
  }));
}

// GET /api/requests/:id/quotation?minTrust=&minRelevance=&maxPrice=&page=&limit=
export async function getFilteredQuotationForRequest(req, res) {
  const requestId = Number(req.params.id);

  const minTrust = parseNumber(req.query.minTrust);
  const minRelevance = parseNumber(req.query.minRelevance);
  const maxPrice = parseNumber(req.query.maxPrice);
  const page = parseNumber(req.query.page, 1);
  const limit = parseNumber(req.query.limit, 10);

  try {
    const quotation = await buildQuotationForRequest(requestId);
    const allComparisons = quotation.comparisons || [];

    // Apply filters
    let filtered = allComparisons.filter(c => {
      const trust = c.scores?.trust ?? 0;
      const relevance = c.scores?.relevance ?? 0;
      const totalPrice = c.price?.totalPrice ?? null;

      if (minTrust != null && trust < minTrust) return false;
      if (minRelevance != null && relevance < minRelevance) return false;
      if (maxPrice != null && totalPrice != null && totalPrice > maxPrice) return false;

      return true;
    });

    // Sorting: relevance, trust, then price
    filtered = filtered.sort((a, b) => {
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

    // Pagination
    const safePage = page && page > 0 ? page : 1;
    const safeLimit = limit && limit > 0 ? limit : 10;
    const start = (safePage - 1) * safeLimit;
    const end = start + safeLimit;

    const pageItems = filtered.slice(start, end);
    const rankedPageItems = addRanking(pageItems);

    res.json({
      request: quotation.request,
      meta: {
        total: filtered.length,
        page: safePage,
        limit: safeLimit,
        pages: Math.ceil(filtered.length / safeLimit) || 1,
        filters: {
          minTrust,
          minRelevance,
          maxPrice,
        },
      },
      comparisons: rankedPageItems,
    });
  } catch (err) {
    console.error('Error building filtered quotation', err);
    res.status(404).json({ error: 'Request not found or quotation failed' });
  }
}