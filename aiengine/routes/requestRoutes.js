// routes/requestRoutes.js
import express from 'express';
import {
  createRequest,
  getRequestSummary,
  exportRequestSummary,
  getRawRequest,
  updateRequest,
  addQuoteToRequest,
  getQuotesForRequest,
  setChosenSupplier,
  approveChosenSupplier,
  getRequestRecommendation,
  updateQuotePerformance,
} from '../controllers/requestController.js';
import {
  getFilteredQuotationForRequest,
} from '../controllers/quotationController.js';
import {
  listRequests,
} from '../controllers/requestListController.js';
import {
  updateRequestStatus,
} from '../controllers/requestStatusController.js';
import {
  getRequestStats,
  getSupplierStats,
} from '../controllers/statsController.js';
import {
  deleteRequest,
} from '../controllers/requestDeleteController.js';
import {
  getHealth,
} from '../controllers/healthController.js';
import {
  apiKeyAuth,
} from '../middleware/apiKeyAuth.js';

const router = express.Router();

// Health check (public)
router.get('/health', getHealth);

// Public read endpoints (no API key required)
router.get('/requests', listRequests);
router.get('/requests/:id', getRawRequest);
router.get('/requests/:id/summary', getRequestSummary);
router.get('/requests/:id/export', exportRequestSummary);
router.get('/requests/:id/recommendation', getRequestRecommendation); // AI recommendation
router.get('/requests/:id/quotation', getFilteredQuotationForRequest);
router.get('/requests/:id/quotes', getQuotesForRequest);

// Protected write endpoints (require x-api-key: super-secret-dev-key)
router.post('/requests', apiKeyAuth, createRequest);
router.patch('/requests/:id', apiKeyAuth, updateRequest);
router.patch('/requests/:id/status', apiKeyAuth, updateRequestStatus);
router.post('/requests/:id/quotes', apiKeyAuth, addQuoteToRequest);
router.patch('/requests/:id/chosen-supplier', apiKeyAuth, setChosenSupplier);

// Approve chosen supplier for a request
router.patch('/requests/:id/chosen-supplier/approve', apiKeyAuth, approveChosenSupplier);

// Rate supplier quote performance
router.patch(
  '/requests/:id/quotes/:quoteIndex/performance',
  apiKeyAuth,
  updateQuotePerformance
);

// Delete request and stats endpoints
router.delete('/requests/:id', apiKeyAuth, deleteRequest);
router.get('/stats/requests', apiKeyAuth, getRequestStats);
router.get('/stats/suppliers', apiKeyAuth, getSupplierStats);

export default router;