'use strict';

const js = require('@eslint/js');
const globals = require('globals');

const sharedRules = {
  'no-console': 'off',
  'no-unused-vars': [
    'error',
    {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      caughtErrors: 'all',
      caughtErrorsIgnorePattern: '^_',
    },
  ],
};

module.exports = [
  {
    ignores: ['coverage/**', 'node_modules/**'],
  },

  js.configs.recommended,

  {
    files: ['**/*.js'],
    ignores: ['routes/buyerRoutes.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'script',
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    rules: sharedRules,
  },

  {
    files: ['routes/buyerRoutes.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
      },
    },
    rules: sharedRules,
  },
];