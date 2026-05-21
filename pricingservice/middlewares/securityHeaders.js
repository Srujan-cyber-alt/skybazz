'use strict';

const helmet = require('helmet');

const isProduction = process.env.NODE_ENV === 'production';

const securityHeaders = helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  originAgentCluster: true,
  referrerPolicy: { policy: 'no-referrer' },
  hsts: isProduction
    ? {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      }
    : false,
});

module.exports = securityHeaders;