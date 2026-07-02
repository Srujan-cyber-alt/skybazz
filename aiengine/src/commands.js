import { API_BASE } from './config.js';
import { fetchJson, authHeaders, authJsonOptions } from './api.js';
import { writeAuditEvent, parseAuditLogArgs, showAuditLog } from './audit.js';
import { promptYesNo, promptLine } from './prompts.js';
import { formatNullable, printRecommendationTable } from './formatters.js';

function fail(message) {
  console.error(`Error: ${message}`);
  process.exitCode = 1;
}

function requireRequestId(value, commandName) {
  if (!value) {
    fail(`Please provide requestId: node client.js ${commandName} <id>`);
    return null;
  }

  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    fail(`Invalid requestId "${value}". requestId must be a positive integer.`);
    return null;
  }

  return id;
}

function normalizeSupplierName(value) {
  const trimmed = String(value ?? '').trim();
  return trimmed || '(unknown)';
}

export function ensureRuntime() {
  if (typeof fetch === 'undefined') {
    throw new Error('fetch is not available in this Node runtime. Use Node 18+ or install a fetch polyfill.');
  }
}

async function listOpen() {
  const url = `${API_BASE}/requests?status=open&page=1&limit=100`;
  const { status, body } = await fetchJson(url);

  if (status !== 200) {
    fail(`Failed to list requests ${status} ${JSON.stringify(body)}`);
    return;
  }

  const requests = body.requests || [];
  if (requests.length === 0) {
    console.log('No open requests found.');
    return;
  }

  console.log(`Open requests (${requests.length}):`);
  for (const r of requests) {
    console.log(
      `- id: ${r.requestId}, title: ${r.title}, qty: ${r.quantity}, urgency: ${r.urgency}, country: ${r.destinationCountry}`
    );
  }
}

async function showRequest(id) {
  const url = `${API_BASE}/requests/${id}`;
  const { status, body } = await fetchJson(url);

  if (status !== 200) {
    fail(`Failed to fetch request ${status} ${JSON.stringify(body)}`);
    return;
  }

  console.log('Request details:');
  console.log(JSON.stringify(body, null, 2));
}

async function patchStatus(id, statusValue) {
  const url = `${API_BASE}/requests/${id}/status`;
  const { status, body } = await fetchJson(
    url,
    authJsonOptions('PATCH', { status: statusValue })
  );

  if (status !== 200) {
    fail(`Failed to update status ${status} ${JSON.stringify(body)}`);
    return false;
  }

  console.log(`Updated request ${id} -> ${statusValue}`);
  return true;
}

async function bulkClose() {
  const url = `${API_BASE}/requests?status=open&page=1&limit=100`;
  const { status, body } = await fetchJson(url);

  if (status !== 200) {
    fail(`Could not fetch open requests ${status} ${JSON.stringify(body)}`);
    return;
  }

  const requests = body.requests || [];
  if (requests.length === 0) {
    console.log('No open requests to close.');
    return;
  }

  console.log('The following requests will be closed:');
  for (const r of requests) {
    console.log(`- id: ${r.requestId}, title: ${r.title}`);
  }

  const answer = await promptYesNo('Proceed to close all above requests? (y/N) ');
  if (!answer) {
    console.log('Aborted.');
    return;
  }

  for (const r of requests) {
    await patchStatus(r.requestId, 'closed');
  }

  console.log('Bulk close completed.');
}

async function addQuote(id) {
  console.log(`Adding quote for request ${id}...`);

  const supplierName = await promptLine('Supplier name: ');
  if (!supplierName) {
    fail('Supplier name is required.');
    return;
  }

  const unitPriceStr = await promptLine('Unit price (number): ');
  const unitPrice = Number(unitPriceStr);
  if (Number.isNaN(unitPrice) || unitPrice <= 0) {
    fail('Unit price must be a positive number.');
    return;
  }

  const currency = await promptLine('Currency (default INR): ');
  const currencyFinal = currency || 'INR';

  const leadTimeStr = await promptLine('Lead time in days (optional): ');
  const leadTimeDays = leadTimeStr ? Number(leadTimeStr) : null;
  if (leadTimeStr && (Number.isNaN(leadTimeDays) || leadTimeDays < 0)) {
    fail('Lead time must be a non-negative number.');
    return;
  }

  const notes = await promptLine('Notes (optional): ');

  const url = `${API_BASE}/requests/${id}/quotes`;
  const { status, body } = await fetchJson(
    url,
    authJsonOptions('POST', {
      supplierName,
      unitPrice,
      currency: currencyFinal,
      leadTimeDays,
      notes: notes || null,
    })
  );

  if (status !== 201) {
    fail(`Failed to add quote ${status} ${JSON.stringify(body)}`);
    return;
  }

  console.log(`Added quote for request ${id} from supplier ${supplierName}`);
}

async function listQuotes(id) {
  const quotesUrl = `${API_BASE}/requests/${id}/quotes`;
  const { status, body } = await fetchJson(quotesUrl);

  if (status !== 200) {
    fail(`Failed to fetch quotes for request ${id} ${status} ${JSON.stringify(body)}`);
    return;
  }

  const quotes = body.quotes || [];
  console.log(`Quotes for request ${id} (${body.title}):`);

  if (quotes.length === 0) {
    console.log('  (no quotes found)');
  } else {
    quotes.forEach((q, index) => {
      console.log(
        `#${index} supplier: ${q.supplierName}, unitPrice: ${q.unitPrice} ${q.currency}, leadTimeDays: ${q.leadTimeDays}, notes: ${q.notes || ''}`
      );

      if (
        typeof q.deliveryRating !== 'undefined' ||
        typeof q.qualityRating !== 'undefined' ||
        typeof q.performanceComment !== 'undefined'
      ) {
        console.log(
          `   ratings: delivery=${formatNullable(q.deliveryRating, '-')}, quality=${formatNullable(q.qualityRating, '-')}, comment=${formatNullable(q.performanceComment, '')}`
        );
      }
    });
  }

  if (body.chosenSupplier) {
    console.log(
      `Chosen supplier: ${body.chosenSupplier} (approved: ${body.chosenSupplierApproved ? 'yes' : 'no'})`
    );
  } else {
    console.log('Chosen supplier: (none set)');
  }
}

async function chooseSupplier(id) {
  const quotesUrl = `${API_BASE}/requests/${id}/quotes`;
  const { status: quotesStatus, body: quotesBody } = await fetchJson(quotesUrl);

  if (quotesStatus !== 200) {
    fail(`Failed to fetch quotes for request ${id} ${quotesStatus} ${JSON.stringify(quotesBody)}`);
    return;
  }

  const quotes = quotesBody.quotes || [];
  if (quotes.length === 0) {
    console.log('No quotes found for this request. Add quotes before choosing a supplier.');
    return;
  }

  console.log(`Quotes for request ${id} (${quotesBody.title}):`);
  for (const q of quotes) {
    console.log(
      `- supplier: ${q.supplierName}, unitPrice: ${q.unitPrice} ${q.currency}, leadTimeDays: ${q.leadTimeDays}, notes: ${q.notes || ''}`
    );
  }

  if (quotesBody.chosenSupplier) {
    console.log(
      `Current chosen supplier: ${quotesBody.chosenSupplier} (approved: ${quotesBody.chosenSupplierApproved ? 'yes' : 'no'})`
    );
  }

  const supplierName = await promptLine('Enter supplier name to choose (exact as shown above): ');
  if (!supplierName) {
    fail('No supplier name entered.');
    return;
  }

  const url = `${API_BASE}/requests/${id}/chosen-supplier`;
  const { status, body } = await fetchJson(
    url,
    authJsonOptions('PATCH', { supplierName })
  );

  if (status !== 200) {
    fail(`Failed to set chosen supplier ${status} ${JSON.stringify(body)}`);
    return;
  }

  console.log(`Chosen supplier for request ${id} set to: ${supplierName}`);
}

async function rateSupplier(id) {
  const quotesUrl = `${API_BASE}/requests/${id}/quotes`;
  const { status: quotesStatus, body: quotesBody } = await fetchJson(quotesUrl);

  if (quotesStatus !== 200) {
    fail(`Failed to fetch quotes for request ${id} ${quotesStatus} ${JSON.stringify(quotesBody)}`);
    return;
  }

  const quotes = quotesBody.quotes || [];
  if (quotes.length === 0) {
    console.log('No quotes found for this request. Add quotes before rating.');
    return;
  }

  console.log(`Quotes for request ${id} (${quotesBody.title}):`);
  quotes.forEach((q, index) => {
    console.log(
      `#${index} supplier: ${q.supplierName}, unitPrice: ${q.unitPrice} ${q.currency}, leadTimeDays: ${q.leadTimeDays}, notes: ${q.notes || ''}`
    );

    if (
      typeof q.deliveryRating !== 'undefined' ||
      typeof q.qualityRating !== 'undefined' ||
      typeof q.performanceComment !== 'undefined'
    ) {
      console.log(
        `   existing ratings: delivery=${formatNullable(q.deliveryRating, '-')}, quality=${formatNullable(q.qualityRating, '-')}, comment=${formatNullable(q.performanceComment, '')}`
      );
    }
  });

  const indexStr = await promptLine('Enter quote index to rate (e.g. 0, 1, 2): ');
  const quoteIndex = Number(indexStr);

  if (!Number.isNaN(quoteIndex) && !Number.isInteger(quoteIndex)) {
    fail('Quote index must be an integer.');
    return;
  }

  if (Number.isNaN(quoteIndex) || quoteIndex < 0 || quoteIndex >= quotes.length) {
    fail('Invalid quote index.');
    return;
  }

  const deliveryRatingStr = await promptLine('Delivery rating (1-5, optional): ');
  const qualityRatingStr = await promptLine('Quality rating (1-5, optional): ');
  const comment = await promptLine('Performance comment (optional): ');

  const bodyPayload = {};
  if (deliveryRatingStr) bodyPayload.deliveryRating = Number(deliveryRatingStr);
  if (qualityRatingStr) bodyPayload.qualityRating = Number(qualityRatingStr);
  if (comment) bodyPayload.comment = comment;

  const url = `${API_BASE}/requests/${id}/quotes/${quoteIndex}/performance`;
  const { status, body } = await fetchJson(
    url,
    authJsonOptions('PATCH', bodyPayload)
  );

  if (status !== 200) {
    fail(`Failed to update quote performance ${status} ${JSON.stringify(body)}`);
    return;
  }

  console.log(`Updated performance for quote #${quoteIndex} on request ${id}`);
}

async function approveSupplier(id, auditMeta = null, skipPrompt = false) {
  const requestUrl = `${API_BASE}/requests/${id}`;
  const { status: reqStatus, body: requestBody } = await fetchJson(requestUrl);

  if (reqStatus !== 200) {
    fail(`Failed to fetch request ${id} ${reqStatus} ${JSON.stringify(requestBody)}`);
    return;
  }

  const specs = requestBody.specs || {};
  const chosenSupplier = specs.chosenSupplier || null;
  const chosenSupplierApproved = specs.chosenSupplierApproved || false;
  const canonicalRequestId = requestBody.requestId;

  if (!chosenSupplier) {
    console.log('No chosen supplier set for this request. Use choose-supplier first.');
    return;
  }

  console.log(
    `Request ${canonicalRequestId} (${requestBody.title}) current chosen supplier: ${chosenSupplier} (approved: ${chosenSupplierApproved ? 'yes' : 'no'})`
  );

  if (chosenSupplierApproved) {
    console.log(`Supplier ${chosenSupplier} is already approved for request ${canonicalRequestId}.`);

    if (auditMeta?.logAlreadyApproved) {
      writeAuditEvent({
        timestamp: new Date().toISOString(),
        requestId: canonicalRequestId,
        title: requestBody.title,
        supplier: chosenSupplier,
        actor: auditMeta?.actor || 'user',
        action: 'approval-skipped',
        reason: 'supplier already approved',
        finalScore: auditMeta?.finalScore ?? null,
        trust: auditMeta?.trust ?? null,
        deliveryRating: auditMeta?.deliveryRating ?? null,
        approvedSelections: auditMeta?.approvedSelections ?? null,
        guardrailResult: auditMeta?.guardrailResult || 'passed',
      });
    }

    return;
  }

  if (!skipPrompt) {
    const confirm = await promptYesNo('Approve this supplier? (y/N) ');
    if (!confirm) {
      console.log('Approval cancelled.');
      return;
    }
  }

  const url = `${API_BASE}/requests/${id}`;
  const { status, body } = await fetchJson(
    url,
    authJsonOptions('PATCH', {
      specs: {
        ...(specs || {}),
        chosenSupplier,
        chosenSupplierApproved: true,
      },
    })
  );

  if (status !== 200) {
    fail(`Failed to approve chosen supplier ${status} ${JSON.stringify(body)}`);
    return;
  }

  const updatedSpecs = body.specs || {};

  writeAuditEvent({
    timestamp: new Date().toISOString(),
    requestId: body.requestId,
    title: body.title,
    supplier: updatedSpecs.chosenSupplier,
    actor: auditMeta?.actor || 'user',
    action: auditMeta?.action || 'manual-approved',
    reason: auditMeta?.reason || 'supplier approved',
    finalScore: auditMeta?.finalScore ?? null,
    trust: auditMeta?.trust ?? null,
    deliveryRating: auditMeta?.deliveryRating ?? null,
    approvedSelections: auditMeta?.approvedSelections ?? null,
    guardrailResult: auditMeta?.guardrailResult || 'passed',
  });

  console.log(
    `Approved supplier ${updatedSpecs.chosenSupplier} for request ${body.requestId} (approved: ${updatedSpecs.chosenSupplierApproved ? 'yes' : 'no'})`
  );
}

async function showStats() {
  const url = `${API_BASE}/stats/requests`;
  const { status, body } = await fetchJson(url, {
    headers: authHeaders(),
  });

  if (status !== 200) {
    fail(`Failed to fetch stats ${status} ${JSON.stringify(body)}`);
    return;
  }

  console.log('RFQ stats:');
  console.log(`- total requests: ${body.counts?.total ?? 0}`);
  console.log(
    `- open: ${body.counts?.open ?? 0}, quoted: ${body.counts?.quoted ?? 0}, closed: ${body.counts?.closed ?? 0}`
  );

  if (body.cycleTimes) {
    if (body.cycleTimes.openToQuotedAvgDays != null) {
      console.log(
        `- avg open -> quoted time: ${body.cycleTimes.openToQuotedAvgDays.toFixed(2)} days`
      );
    }
    if (body.cycleTimes.quotedToClosedAvgDays != null) {
      console.log(
        `- avg quoted -> closed time: ${body.cycleTimes.quotedToClosedAvgDays.toFixed(2)} days`
      );
    }
  }
}

async function showSupplierStats() {
  const url = `${API_BASE}/stats/suppliers`;
  const { status, body } = await fetchJson(url, {
    headers: authHeaders(),
  });

  if (status !== 200) {
    fail(`Failed to fetch supplier stats ${status} ${JSON.stringify(body)}`);
    return;
  }

  const suppliers = body.suppliers || [];
  if (suppliers.length === 0) {
    console.log('No supplier stats available yet.');
    return;
  }

  console.log('Supplier stats:');
  console.log(
    'name                     quotes  avgPrice    avgDelivery  avgQuality  approvedSelections  rfqRFQs  rfqShare'
  );
  console.log(
    '------------------------ ------  -----------  -----------  ----------  -----------------  -------  --------'
  );

  for (const s of suppliers) {
    const name = normalizeSupplierName(s.supplierName).slice(0, 24).padEnd(24, ' ');
    const quotes = String(s.quoteCount || 0).padStart(6, ' ');
    const avgPrice =
      s.averageUnitPrice != null ? s.averageUnitPrice.toFixed(2).padStart(11, ' ') : '     n/a   ';
    const avgDel =
      s.averageDeliveryRating != null
        ? s.averageDeliveryRating.toFixed(2).padStart(11, ' ')
        : '     n/a   ';
    const avgQual =
      s.averageQualityRating != null
        ? s.averageQualityRating.toFixed(2).padStart(10, ' ')
        : '    n/a   ';
    const approved = String(s.approvedSelectionCount || 0).padStart(17, ' ');
    const rfqCount = String(s.rfqParticipationCount || 0).padStart(7, ' ');
    const rfqShare =
      s.rfqParticipationShare != null
        ? (s.rfqParticipationShare * 100).toFixed(1).padStart(8, ' ')
        : '     n/a';

    console.log(
      `${name} ${quotes}  ${avgPrice}  ${avgDel}  ${avgQual}  ${approved}  ${rfqCount}  ${rfqShare}`
    );
  }
}

async function showRecommendation(id) {
  const url = `${API_BASE}/requests/${id}/recommendation`;
  const { status, body } = await fetchJson(url);

  if (status !== 200) {
    fail(`Failed to fetch recommendation ${status} ${JSON.stringify(body)}`);
    return;
  }

  const { request, recommendation, ranking } = body;

  console.log('');
  console.log(`Recommendation for request ${request.requestId}: ${request.title}`);
  console.log('');

  console.log('Recommended supplier:');
  printRecommendationTable([recommendation]);
  console.log('');

  const perf = recommendation.scoreBreakdown?.performance || {};
  const trust = recommendation.scores?.trust ?? 0;
  const needsReview =
    trust < 70 || (perf.deliveryRating ?? 0) < 4 || (perf.approvedSelections ?? 0) < 1;

  console.log(needsReview ? 'Status: needs manual review' : 'Status: eligible for auto-approval');
  console.log('');
  console.log('Reasoning:');
  console.log(recommendation.reasoning);
  console.log('');

  if (recommendation.scoreBreakdown) {
    console.log('Score breakdown:');
    console.log(JSON.stringify(recommendation.scoreBreakdown, null, 2));
    console.log('');
  }

  if (Array.isArray(ranking) && ranking.length > 0) {
    console.log('Ranking:');
    printRecommendationTable(ranking, true);
  }
}

async function approveBest(id) {
  console.log(`Auto-approving best supplier for request ${id}...`);

  const requestUrl = `${API_BASE}/requests/${id}`;
  const { status: reqStatus, body: requestBody } = await fetchJson(requestUrl);

  if (reqStatus !== 200) {
    fail(`Failed to fetch request ${id} ${reqStatus} ${JSON.stringify(requestBody)}`);
    return;
  }

  const specs = requestBody?.specs || {};
  const alreadyApproved = specs.chosenSupplierApproved === true;
  const alreadyChosenSupplier = specs.chosenSupplier || null;

  if (alreadyApproved && alreadyChosenSupplier) {
    console.log(
      `Request ${requestBody.requestId} already has approved supplier: ${alreadyChosenSupplier}. Skipping auto-approval.`
    );
    return;
  }

  const recUrl = `${API_BASE}/requests/${id}/recommendation`;
  const { status: recStatus, body: recBody } = await fetchJson(recUrl);

  if (recStatus !== 200) {
    fail(`Failed to fetch recommendation ${recStatus} ${JSON.stringify(recBody)}`);
    return;
  }

  const recommendation = recBody?.recommendation;
  const canonicalRequestId = recBody?.request?.requestId ?? requestBody?.requestId ?? id;
  const requestTitle = recBody?.request?.title ?? requestBody?.title ?? null;

  if (!recommendation) {
    fail('No recommendation found in response.');
    return;
  }

  const recommendedSupplierName = recommendation.supplier?.name;
  if (!recommendedSupplierName) {
    fail('No recommended supplier name found in response.');
    return;
  }

  const perf = recommendation.scoreBreakdown?.performance || {};
  const trust = recommendation.scores?.trust ?? 0;
  const deliveryRating = perf.deliveryRating ?? 0;
  const approvedSelections = perf.approvedSelections ?? 0;
  const finalScore = recommendation.finalScore ?? null;

  console.log(`Recommended supplier: ${recommendedSupplierName}`);
  console.log(
    `Guardrails check: trust=${trust}, delivery=${deliveryRating}, approvals=${approvedSelections}`
  );

  if (trust < 70 || deliveryRating < 4 || approvedSelections < 1) {
    writeAuditEvent({
      timestamp: new Date().toISOString(),
      requestId: canonicalRequestId,
      title: requestTitle,
      supplier: recommendedSupplierName,
      actor: 'system',
      action: 'auto-approval-blocked',
      reason: `blocked by guardrails: trust=${trust}, delivery=${deliveryRating}, approvals=${approvedSelections}`,
      finalScore,
      trust,
      deliveryRating,
      approvedSelections,
      guardrailResult: 'blocked',
    });
    console.log('Recommendation needs manual review. Auto-approval skipped.');
    return;
  }

  const chooseUrl = `${API_BASE}/requests/${id}/chosen-supplier`;
  const { status: chooseStatus, body: chooseBody } = await fetchJson(
    chooseUrl,
    authJsonOptions('PATCH', { supplierName: recommendedSupplierName })
  );

  if (chooseStatus !== 200) {
    fail(`Failed to set chosen supplier ${chooseStatus} ${JSON.stringify(chooseBody)}`);
    return;
  }

  console.log(`Chosen supplier for request ${canonicalRequestId} set to: ${recommendedSupplierName}`);

  await approveSupplier(
    id,
    {
      actor: 'system',
      action: 'auto-approved',
      reason: 'passed guardrails and auto-approved top recommendation',
      finalScore,
      trust,
      deliveryRating,
      approvedSelections,
      guardrailResult: 'passed',
    },
    true
  );
}

export function usage() {
  console.log(`
Usage:
  node client.js <command> [options]

Common flows:
  node client.js list-open
  node client.js show 11
  node client.js recommendation 11
  node client.js approve-best 11
  node client.js audit-log --request 11
  node client.js audit-log --request 11 --action auto-approval-blocked --full

Commands:

  Requests
    list-open
      List open requests in summary form.

    show <requestId>
      Show full details for a request.

    quote <requestId>
      Mark a request as quoted.

    close-one <requestId>
      Close a single request.

    reopen <requestId>
      Reopen a closed request.

    bulk-close
      Close all open requests after confirmation.

  Quotes
    add-quote <requestId>
      Add a supplier quote to a request.

    list-quotes <requestId>
      List quotes for a request.

    choose-supplier <requestId>
      Choose a supplier from existing quotes.

    rate-supplier <requestId>
      Rate supplier delivery/quality performance.

    approve-supplier <requestId>
      Approve the chosen supplier for a request.

  Insights
    stats
      Show request-level RFQ stats.

    supplier-stats
      Show aggregated supplier stats.

    recommendation <requestId>
      Show AI recommendation and ranking for a request.

    approve-best <requestId>
      Auto choose and approve the recommended supplier if guardrails pass.

    audit-log [n] [--request <id>] [--action <name>] [--full|--json]
      Show recent audit log entries with optional filters.

Audit log options:
  --request <id>
      Only show entries for one request.

  --action <name>
      Only show entries with a matching action.

  --full
      Print pretty JSON entries.

  --json
      Print compact JSON lines.

Examples:
  node client.js show 11
  node client.js list-quotes 11
  node client.js recommendation 11
  node client.js approve-best 11
  node client.js audit-log 5
  node client.js audit-log --request 11
  node client.js audit-log --request 11 --action auto-approval-blocked
  node client.js audit-log 2 --request 11 --action auto-approval-blocked --full

Validation rules:
  - requestId must be a positive integer.
  - Unknown commands return an error and exit code 1.
  - Validation errors return exit code 1.
`);
}

export function buildCommandHandlers(args) {
  return {
    'list-open': async () => {
      await listOpen();
    },
    show: async () => {
      const id = requireRequestId(args[1], 'show');
      if (id === null) return;
      await showRequest(id);
    },
    quote: async () => {
      const id = requireRequestId(args[1], 'quote');
      if (id === null) return;
      await patchStatus(id, 'quoted');
    },
    'close-one': async () => {
      const id = requireRequestId(args[1], 'close-one');
      if (id === null) return;
      await patchStatus(id, 'closed');
    },
    reopen: async () => {
      const id = requireRequestId(args[1], 'reopen');
      if (id === null) return;
      await patchStatus(id, 'open');
    },
    'bulk-close': async () => {
      await bulkClose();
    },
    'add-quote': async () => {
      const id = requireRequestId(args[1], 'add-quote');
      if (id === null) return;
      await addQuote(id);
    },
    'list-quotes': async () => {
      const id = requireRequestId(args[1], 'list-quotes');
      if (id === null) return;
      await listQuotes(id);
    },
    'choose-supplier': async () => {
      const id = requireRequestId(args[1], 'choose-supplier');
      if (id === null) return;
      await chooseSupplier(id);
    },
    'rate-supplier': async () => {
      const id = requireRequestId(args[1], 'rate-supplier');
      if (id === null) return;
      await rateSupplier(id);
    },
    'approve-supplier': async () => {
      const id = requireRequestId(args[1], 'approve-supplier');
      if (id === null) return;
      await approveSupplier(id);
    },
    stats: async () => {
      await showStats();
    },
    'supplier-stats': async () => {
      await showSupplierStats();
    },
    recommendation: async () => {
      const id = requireRequestId(args[1], 'recommendation');
      if (id === null) return;
      await showRecommendation(id);
    },
    'approve-best': async () => {
      const id = requireRequestId(args[1], 'approve-best');
      if (id === null) return;
      await approveBest(id);
    },
    'audit-log': async () => {
      const parsed = parseAuditLogArgs(args.slice(1));
      showAuditLog(parsed.limit, parsed.format, parsed.requestId, parsed.action);
    },
    help: async () => {
      usage();
    },
  };
}