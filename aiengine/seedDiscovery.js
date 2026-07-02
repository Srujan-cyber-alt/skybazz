// seedDiscovery.js
import { seedExampleDiscoveryForRequest } from './services/discoveryService.js';

const requestId = 2; // use an existing request ID from your requests table

async function run() {
  try {
    const result = await seedExampleDiscoveryForRequest(requestId);
    console.log('✅ Seeded discovery for request', requestId, result);
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
}

run();