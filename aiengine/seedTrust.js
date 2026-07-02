import { evaluateSupplierTrustForRequest } from './services/discoveryService.js';

const supplierId = 1; // from your seeded data
const requestId = 2;  // existing request

async function run() {
  try {
    const result = await evaluateSupplierTrustForRequest({ supplierId, requestId });
    console.log('✅ Trust evaluation result:', result);
    process.exit(0);
  } catch (err) {
    console.error('❌ Trust evaluation failed:', err);
    process.exit(1);
  }
}

run();