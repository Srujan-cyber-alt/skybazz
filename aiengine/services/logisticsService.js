// Logistics / Shipping Estimate Agent

function chooseBetterItem(existing, candidate) {
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
  
    const existingTotal = existing.logistics?.totalWithLogistics ?? Number.MAX_SAFE_INTEGER;
    const candidateTotal = candidate.logistics?.totalWithLogistics ?? Number.MAX_SAFE_INTEGER;
  
    return candidateTotal < existingTotal ? candidate : existing;
  }
  
  function dedupeLogistics(items) {
    const map = new Map();
  
    for (const item of items) {
      const supplierId = item.supplier?.id || item.supplier?.name;
      if (!supplierId) continue;
  
      if (!map.has(supplierId)) {
        map.set(supplierId, item);
      } else {
        const best = chooseBetterItem(map.get(supplierId), item);
        map.set(supplierId, best);
      }
    }
  
    return [...map.values()];
  }
  
  export async function buildLogisticsEstimateForQuotation(quotation) {
    const { request, comparisons } = quotation;
  
    function getLogisticsRate(destinationCountry) {
      if (!destinationCountry || destinationCountry.toLowerCase() === 'india') {
        return 0.05;
      }
      return 0.12;
    }
  
    const rate = getLogisticsRate(request.destinationCountry || 'India');
  
    const withLogistics = comparisons.map((c) => {
      const productTotal = c.price.totalPrice ?? 0;
      const logisticsCost = productTotal * rate;
      const totalWithLogistics = productTotal + logisticsCost;
  
      return {
        ...c,
        logistics: {
          destinationCountry: request.destinationCountry || 'India',
          rate,
          logisticsCost,
          totalWithLogistics,
        },
      };
    });
  
    const ranked = dedupeLogistics(withLogistics).sort((a, b) => {
      const aTotal = a.logistics.totalWithLogistics ?? Number.MAX_SAFE_INTEGER;
      const bTotal = b.logistics.totalWithLogistics ?? Number.MAX_SAFE_INTEGER;
  
      if (aTotal !== bTotal) {
        return aTotal - bTotal;
      }
  
      return (b.scores?.relevance ?? 0) - (a.scores?.relevance ?? 0);
    });
  
    return {
      request,
      comparisons: ranked,
    };
  }