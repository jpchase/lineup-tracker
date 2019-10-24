/* eslint-disable import/no-extraneous-dependencies */
const { createDefaultConfig } = require('@open-wc/testing-karma');
const merge = require('webpack-merge');

module.exports = config => {
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
              "module-resolver",
              {
                "alias": {
                  "@app": "./src"
                }
              }
            ]
          ]
        }
      },

      // TODO: Remove/change back to 80 after improving tests
      coverageIstanbulReporter: {
        // TODO: Remove emitWarning after all Redux tests converted
        emitWarning: true,
        thresholds: {
          global: {
            statements: 60,
            lines: 60,
            branches: 55,
            functions: 45
          }
        }
      }
    }),
  );
  return config;
};
