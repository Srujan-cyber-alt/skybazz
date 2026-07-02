'use strict';

require('dotenv').config();

const http = require('http');
const app = require('./app');
const db = require('./db');

const PORT = Number(process.env.PORT || 3009);
const HOST = process.env.HOST || '0.0.0.0';
const SHUTDOWN_TIMEOUT_MS = Number(process.env.SHUTDOWN_TIMEOUT_MS || 10000);

if (!Number.isInteger(PORT) || PORT <= 0) {
  throw new Error('Invalid PORT configuration');
}

const server = http.createServer(app);

let shuttingDown = false;

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`Received ${signal}. Starting graceful shutdown...`);

  const timer = setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);

  timer.unref();

  server.close(async (error) => {
    if (error) {
      console.error('Error while closing server:', error);
      process.exit(1);
    }

    try {
      await db.close();
      console.log('MySQL pool closed');
      process.exit(0);
    } catch (dbError) {
      console.error('Error while closing MySQL pool:', dbError);
      process.exit(1);
    }
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  shutdown('uncaughtException');
});

async function start() {
  try {
    await db.ping();
    console.log('MySQL connected');

    server.listen(PORT, HOST, () => {
      console.log(`pricingservice listening on ${HOST}:${PORT}`);
    });
  } catch (error) {
    console.error('MySQL connection failed:', error);
    process.exit(1);
  }
}

start();

module.exports = server;