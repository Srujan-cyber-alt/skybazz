// smoke-test.js
const API_BASE = 'http://localhost:3000/api';
const API_KEY = 'super-secret-dev-key';

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  try {
    return { status: res.status, body: JSON.parse(text) };
  } catch {
    return { status: res.status, body: text };
  }
}

async function testApprovalFlow(requestId) {
  console.log(`\n=== Approval flow test for request ${requestId} ===`);

  const quotesRes = await fetchJson(`${API_BASE}/requests/${requestId}/quotes`);
  if (quotesRes.status !== 200) {
    console.error('Failed to fetch quotes', quotesRes.status, quotesRes.body);
    process.exit(1);
  }
  console.log('PASS: fetched quotes');

  const quotes = quotesRes.body.quotes || [];
  if (quotes.length === 0) {
    console.error('No quotes available for this request.');
    process.exit(1);
  }

  const chosen = quotes[0].supplierName;
  const chooseRes = await fetchJson(`${API_BASE}/requests/${requestId}/chosen-supplier`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
    },
    body: JSON.stringify({ supplierName: chosen }),
  });

  if (chooseRes.status !== 200) {
    console.error('Failed to choose supplier', chooseRes.status, chooseRes.body);
    process.exit(1);
  }
  console.log(`PASS: chose supplier ${chosen}`);

  const approveRes = await fetchJson(`${API_BASE}/requests/${requestId}/chosen-supplier/approve`, {
    method: 'PATCH',
    headers: {
      'x-api-key': API_KEY,
    },
  });

  if (approveRes.status !== 200) {
    console.error('Failed to approve supplier', approveRes.status, approveRes.body);
    process.exit(1);
  }
  console.log('PASS: approved chosen supplier');

  const verifyRes = await fetchJson(`${API_BASE}/requests/${requestId}/quotes`);
  if (verifyRes.status !== 200) {
    console.error('Failed to verify quotes', verifyRes.status, verifyRes.body);
    process.exit(1);
  }
  const verifiedApproved = verifyRes.body.chosenSupplierApproved === true;
  if (!verifiedApproved) {
    console.error('Verification failed: chosenSupplierApproved is not true');
    process.exit(1);
  }

  console.log('PASS: verification confirmed approved = yes');
  console.log('Approval flow test completed successfully.');
}

async function testRecommendationFlow(requestId) {
  console.log(`\n=== Recommendation + approve-best test for request ${requestId} ===`);

  const recRes = await fetchJson(`${API_BASE}/requests/${requestId}/recommendation`);
  if (recRes.status !== 200) {
    console.error('Failed to fetch recommendation', recRes.status, recRes.body);
    process.exit(1);
  }
  console.log('PASS: fetched recommendation');

  const recommendedSupplierName = recRes.body?.recommendation?.supplier?.name;
  if (!recommendedSupplierName) {
    console.error('No recommended supplier name found in response.');
    process.exit(1);
  }
  console.log(`PASS: recommendation suggests supplier ${recommendedSupplierName}`);

  const chooseRes = await fetchJson(`${API_BASE}/requests/${requestId}/chosen-supplier`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
    },
    body: JSON.stringify({ supplierName: recommendedSupplierName }),
  });

  if (chooseRes.status !== 200) {
    console.error('Failed to set chosen supplier from recommendation', chooseRes.status, chooseRes.body);
    process.exit(1);
  }
  console.log('PASS: set chosen supplier from recommendation');

  const approveRes = await fetchJson(`${API_BASE}/requests/${requestId}/chosen-supplier/approve`, {
    method: 'PATCH',
    headers: {
      'x-api-key': API_KEY,
    },
  });

  if (approveRes.status !== 200) {
    console.error('Failed to approve recommended supplier', approveRes.status, approveRes.body);
    process.exit(1);
  }
  console.log('PASS: approved recommended supplier');

  const verifyRes = await fetchJson(`${API_BASE}/requests/${requestId}/quotes`);
  if (verifyRes.status !== 200) {
    console.error('Failed to verify quotes after recommendation', verifyRes.status, verifyRes.body);
    process.exit(1);
  }

  const specsChosen = verifyRes.body.chosenSupplier;
  const specsApproved = verifyRes.body.chosenSupplierApproved === true;

  if (specsChosen !== recommendedSupplierName || !specsApproved) {
    console.error(
      'Verification failed: chosenSupplier or chosenSupplierApproved do not match recommendation state',
      { specsChosen, specsApproved, recommendedSupplierName }
    );
    process.exit(1);
  }

  console.log('PASS: verification confirmed chosen = recommended supplier and approved = yes');
  console.log('Recommendation + approve-best test completed successfully.');
}

async function main() {
  const requestId = process.argv[2];
  if (!requestId) {
    console.error('Usage: node smoke-test.js <requestId>');
    process.exit(1);
  }

  console.log(`Testing request ${requestId}...`);

  // 1) Basic approval flow
  await testApprovalFlow(requestId);

  // 2) Recommendation + approve-best-like flow
  await testRecommendationFlow(requestId);

  console.log('\nAll smoke tests completed successfully.');
}

main().catch((err) => {
  console.error('Smoke test failed:', err);
  process.exit(1);
});