// reset-request.js
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

async function main() {
  const requestId = process.argv[2];
  if (!requestId) {
    console.error('Usage: node reset-request.js <requestId>');
    process.exit(1);
  }

  console.log(`Resetting request ${requestId}...`);

  // 1) Get current request
  const reqRes = await fetchJson(`${API_BASE}/requests/${requestId}`);
  if (reqRes.status !== 200) {
    console.error('Failed to fetch request', reqRes.status, reqRes.body);
    process.exit(1);
  }

  const specs = reqRes.body.specs || {};
  const updatedSpecs = {
    ...specs,
    chosenSupplier: null,
    chosenSupplierApproved: false,
  };

  // 2) Reset specs (clear chosen supplier and approval)
  const updateRes = await fetchJson(`${API_BASE}/requests/${requestId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
    },
    body: JSON.stringify({ specs: updatedSpecs }),
  });

  if (updateRes.status !== 200) {
    console.error('Failed to reset specs', updateRes.status, updateRes.body);
    process.exit(1);
  }
  console.log('PASS: reset chosenSupplier and chosenSupplierApproved');

  // 3) Reset status to open
  const statusRes = await fetchJson(`${API_BASE}/requests/${requestId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
    },
    body: JSON.stringify({ status: 'open' }),
  });

  if (statusRes.status !== 200) {
    console.error('Failed to reset status', statusRes.status, statusRes.body);
    process.exit(1);
  }
  console.log('PASS: reset status to open');

  // 4) Verify reset via quotes endpoint
  const verifyRes = await fetchJson(`${API_BASE}/requests/${requestId}/quotes`);
  if (verifyRes.status !== 200) {
    console.error('Failed to verify reset', verifyRes.status, verifyRes.body);
    process.exit(1);
  }

  const vChosen = verifyRes.body.chosenSupplier;
  const vApproved = verifyRes.body.chosenSupplierApproved;

  console.log(
    `Verification: chosenSupplier=${vChosen ?? 'null'}, approved=${vApproved ? 'yes' : 'no'}`
  );

  console.log('Reset completed.');
}

main().catch((err) => {
  console.error('Reset failed:', err);
  process.exit(1);
});