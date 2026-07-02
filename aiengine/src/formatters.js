export function formatNullable(value, fallback = 'n/a') {
    return value ?? fallback;
  }
  
  export function formatPerf(perf = {}) {
    const delivery = perf.deliveryRating ?? '-';
    const quality = perf.qualityRating ?? '-';
    const approvals = perf.approvedSelections ?? '-';
    return `${String(delivery).padStart(2)},  ${String(quality).padStart(2)},  ${String(approvals).padStart(1)}`;
  }
  
  export function formatRecommendationRow(row, includeRank = false) {
    const rank = row.rank ?? 0;
    const name = row.supplier?.name || 'Unknown';
    const priceTotal = row.price?.totalPrice ?? 0;
    const logisticsTotal = row.logistics?.totalWithLogistics ?? 0;
    const relevance = row.scores?.relevance ?? 0;
    const trust = row.scores?.trust ?? 0;
    const priceScore = row.scoreBreakdown?.priceScore ?? 0;
    const finalScore = row.finalScore ?? 0;
    const risk = row.scoreBreakdown?.riskLevel ?? 'n/a';
    const perf = formatPerf(row.scoreBreakdown?.performance || {});
  
    const base =
      `${name.padEnd(24)} ` +
      `${finalScore.toFixed(2).toString().padStart(10)} ` +
      `${priceTotal.toString().padStart(14)} ` +
      `${logisticsTotal.toString().padStart(16)} ` +
      `${relevance.toString().padStart(9)} ` +
      `${trust.toString().padStart(7)} ` +
      `${priceScore.toFixed(2).toString().padStart(10)} ` +
      `${risk.toString().padStart(6)} ` +
      `  ${perf}`;
  
    if (includeRank) {
      return `${String(rank).padStart(4)}  ${base}`;
    }
  
    return base;
  }
  
  export function printRecommendationTable(rows, includeRank = false) {
    if (includeRank) {
      console.log(
        'rank  name                     finalScore  priceTotal      logisticsTotal   relevance  trust   priceScore  risk   perf(del,qual,apps)'
      );
      console.log(
        '----  ------------------------ ---------- --------------  ----------------  ---------  -----   ----------  -----  ------------------'
      );
    } else {
      console.log(
        'name                     finalScore  priceTotal      logisticsTotal   relevance  trust   priceScore  risk   perf(del,qual,apps)'
      );
      console.log(
        '------------------------ ---------- --------------  ----------------  ---------  -----   ----------  -----  ------------------'
      );
    }
  
    for (const row of rows) {
      console.log(formatRecommendationRow(row, includeRank));
    }
  }