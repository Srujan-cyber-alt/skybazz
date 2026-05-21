'use strict';

require('dotenv').config();

const http = require('http');
const app = require('./app');

const PORT = Number(process.env.PORT || 3009);
const HOST = process.env.HOST || '0.0.0.0';
const SHUTDOWN_TIMEOUT_MS = Number(process.env.SHUTDOWN_TIMEOUT_MS || 10000);

if (!Number.isInteger(PORT) || PORT <= 0) {
  throw new Error('Invalid PORT configuration');
}

const server = http.createServer(app);

let isShuttingDown = false;

function shutdown(signal) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  console.log(`⚠️ pricingservice received ${signal}. Starting graceful shutdown...`);

  server.close((error) => {
    if (error) {
      console.error('❌ Error while closing server:', error);
      process.exit(1);
    }

    console.log('✅ pricingservice shutdown completed');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('❌ Forced shutdown after timeout');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  shutdown('uncaughtException');
});

server.listen(PORT, HOST, () => {
  console.log(`✅ pricingservice listening on ${HOST}:${PORT}`);
});

module.exports = server;