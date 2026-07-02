import { buildQuotationForRequest } from '../services/quotationService.js';
import { buildLogisticsEstimateForQuotation } from '../services/logisticsService.js';

export async function getRequestLogistics(req, res) {
  try {
    const requestId = Number(req.params.id);
    if (!requestId) {
      return res.status(400).json({ error: 'invalid request id' });
    }

    const quotation = await buildQuotationForRequest(requestId);
    const withLogistics = await buildLogisticsEstimateForQuotation(quotation);

    return res.json(withLogistics);
  } catch (err) {
    return res.status(500).json({
      error: 'Failed to build logistics estimate',
      details: err.message,
    });
  }
}