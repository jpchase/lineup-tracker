/* eslint-disable import/no-extraneous-dependencies */
const { createDefaultConfig } = require('@open-wc/testing-karma');
const merge = require('webpack-merge');
const path = require('path');

module.exports = (config) => {
  config.set(
    merge(createDefaultConfig(config), {
      files: [
        // runs all files ending with .test in the test folder,
        // can be overwritten by passing a --grep flag. examples:
        //
        // npm run test -- --grep test/foo/bar.test.js
        // npm run test -- --grep test/bar/*
        { pattern: config.grep ? config.grep : 'test/**/*.test.js', type: 'module' },
      ],

      esm: {
        nodeResolve: true,
        babelConfig:
        {
          plugins: [
            [
              'module-resolver',
              {
                'alias': {
                  '@app': './src'
                }
              }
            ]
          ]
        }
      },

      snapshot: {
        pathResolver(basePath, suiteName) {
          return path.join(basePath, 'test', '__snapshots__', `${suiteName}.md`);
        },
      },

      // TODO: Remove/change back to 80 after improving tests
      coverageIstanbulReporter: {
        emitWarning: false,
        thresholds: {
          global: {
            branches: 70,
          }
        }
      }
    }),
  );
  return config;
};
