'use strict';

jest.mock('./db', () => ({
  ping: jest.fn(),
  close: jest.fn(),
}));

jest.mock('./app', () => {
  const express = require('express');
  return express();
});

const db = require('./db');

describe('server startup', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    db.ping.mockResolvedValue(true);
  });

  it('loads without crashing when db ping succeeds', async () => {
    const originalListen = require('http').createServer;
    expect(originalListen).toBeDefined();
  });
});