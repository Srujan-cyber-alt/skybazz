'use strict';

const express = require('express');
const {
  getAiPricingSuggestions,
  getDemandForecast,
} = require('../controllers/sellerInsightsController');

const router = express.Router();

router.get('/ai-pricing', getAiPricingSuggestions);
router.get('/demand-forecast', getDemandForecast);

module.exports = router;