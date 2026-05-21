'use strict';

const getAiPricingSuggestions = async (req, res, next) => {
  try {
    const payload = {
      success: true,
      message: 'AI pricing suggestions fetched successfully',
      requestId: req.context?.requestId || null,
      data: [
        {
          id: 'prod-001',
          productName: 'Premium Basmati Rice',
          sku: 'RICE-BAS-001',
          currentPrice: 1200,
          suggestedPrice: 1299,
          currency: 'INR',
          confidenceScore: 0.91,
          demandLevel: 'high',
          competitionLevel: 'medium',
          expectedMarginLiftPercent: 8.25,
          reason:
            'Demand is increasing, competitor price band is higher, and current stock turnover supports a moderate price increase.',
          action: 'increase',
        },
        {
          id: 'prod-002',
          productName: 'Organic Turmeric Powder',
          sku: 'TURM-ORG-002',
          currentPrice: 250,
          suggestedPrice: 275,
          currency: 'INR',
          confidenceScore: 0.86,
          demandLevel: 'stable',
          competitionLevel: 'low',
          expectedMarginLiftPercent: 6.5,
          reason:
            'Repeat purchase behavior is steady and market benchmark pricing indicates room for controlled upward adjustment.',
          action: 'increase',
        },
        {
          id: 'prod-003',
          productName: 'Cold Pressed Groundnut Oil',
          sku: 'OIL-GRN-003',
          currentPrice: 410,
          suggestedPrice: 395,
          currency: 'INR',
          confidenceScore: 0.79,
          demandLevel: 'moderate',
          competitionLevel: 'high',
          expectedMarginLiftPercent: -1.75,
          reason:
            'Competitive pressure is high in this category, so a slight reduction may improve conversion and basket completion.',
          action: 'decrease',
        },
      ],
    };

    return res.status(200).json(payload);
  } catch (error) {
    return next(error);
  }
};

const getDemandForecast = async (req, res, next) => {
  try {
    const payload = {
      success: true,
      message: 'Demand forecast fetched successfully',
      requestId: req.context?.requestId || null,
      data: [
        {
          id: 'prod-001',
          productName: 'Premium Basmati Rice',
          sku: 'RICE-BAS-001',
          currentStock: 20,
          forecastedDemandNext7Days: 35,
          forecastedDemandNext30Days: 142,
          trend: 'rising',
          reorderSuggested: true,
          reorderQuantity: 150,
          riskLevel: 'medium',
        },
        {
          id: 'prod-002',
          productName: 'Organic Turmeric Powder',
          sku: 'TURM-ORG-002',
          currentStock: 50,
          forecastedDemandNext7Days: 28,
          forecastedDemandNext30Days: 110,
          trend: 'stable',
          reorderSuggested: false,
          reorderQuantity: 0,
          riskLevel: 'low',
        },
        {
          id: 'prod-003',
          productName: 'Cold Pressed Groundnut Oil',
          sku: 'OIL-GRN-003',
          currentStock: 12,
          forecastedDemandNext7Days: 18,
          forecastedDemandNext30Days: 84,
          trend: 'rising',
          reorderSuggested: true,
          reorderQuantity: 100,
          riskLevel: 'high',
        },
      ],
    };

    return res.status(200).json(payload);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getAiPricingSuggestions,
  getDemandForecast,
};