import { buildQuotationForRequest } from '../services/quotationService.js';
import { buildLogisticsEstimateForQuotation } from '../services/logisticsService.js';
import { getCandidatesForRequest } from '../services/discoveryService.js';

export async function getRequestSummary(req, res) {
  try {
    const requestId = Number(req.params.id);
    if (!requestId) {
      return res.status(400).json({ error: 'invalid request id' });
    }

    // 1) Quotation (includes requirements + comparisons with product cost)
    const quotation = await buildQuotationForRequest(requestId);

    // 2) Logistics estimate on top of quotation
    const withLogistics = await buildLogisticsEstimateForQuotation(quotation);

    // 3) Raw candidates list (if you want separate view too)
    const candidates = await getCandidatesForRequest(requestId);

    // Build a single summary object
    const summary = {
      request: withLogistics.request,
      candidates,
      quotation: quotation.comparisons,
      logistics: withLogistics.comparisons,
    };

    return res.json(summary);
  } catch (err) {
    return res.status(500).json({
      error: 'Failed to build request summary',
      details: err.message,
    });
  }
}