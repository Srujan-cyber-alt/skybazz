'use strict';

const mysql = require('mysql2/promise');

const requiredEnv = ['DB_NAME', 'DB_USER', 'DB_PASSWORD'];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required database environment variable: ${key}`);
  }
}

const baseConfig = {
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
};

if (process.env.DB_SOCKET) {
  baseConfig.socketPath = process.env.DB_SOCKET;
} else {
  if (!process.env.DB_HOST) {
    throw new Error('Missing required database environment variable: DB_HOST');
  }
  baseConfig.host = process.env.DB_HOST;
  baseConfig.port = Number(process.env.DB_PORT || 3306);
}

const pool = mysql.createPool(baseConfig);

async function query(sql, params = []) {
  return pool.execute(sql, params);
}

async function ping() {
  const connection = await pool.getConnection();
  try {
    await connection.ping();
    return true;
  } finally {
    connection.release();
  }
}

async function close() {
  await pool.end();
}

module.exports = {
  pool,
  query,
  ping,
  close,
};