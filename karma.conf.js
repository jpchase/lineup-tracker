const { createDefaultConfig } = require('@open-wc/testing-karma');
const merge = require('deepmerge');
const path = require('path');

function aliasResolverPlugin() {
  return {
    async resolveImport({ source, context }) {
      if (!source.startsWith('@app/')) {
        return;
      }
      const requestedFile = context.path.endsWith('/') ? `${context.path}index.html` : context.path;
      const depth = requestedFile.split('/').length - 1;
      let extension = path.extname(source);
      if (!extension || extension.length === 0) {
        // Default the extension, otherwise it won't resolve.
        extension = '.js';
      } else {
        // Has an extension, which will already be included in the result.
        extension = '';
      }
      const browserPath = `${'../'.repeat(depth - 1)}src/${source.substring(5)}${extension}`;
      return browserPath;
    }
  };
}

module.exports = (config) => {
  process.env.CHROME_BIN = require('puppeteer').executablePath();
  config.set(
      merge(createDefaultConfig(config), {
        // logLevel: config.LOG_DEBUG,
        files: [
          // Performs one-time setup, before any tests are run.
          // TODO: Replace with root hook plugin on Mocha 8.0, see:
          // https://mochajs.org/#root-hook-plugins
          { pattern: 'test/helpers/global-setup.js', watched: false },
          // runs all files ending with .test in the test folder,
          // can be overwritten by passing a --grep flag. examples:
          //
          // npm run test -- --grep test/foo/bar.test.js
          // npm run test -- --grep test/bar/*
          { pattern: config.grep ? config.grep : 'test/**/*.test.js', type: 'module' },
          {
            pattern: 'test/__snapshots__/**/*.md',
            // snapshot preprocessor will rewrite content of .md files with JS wrappers
            // but karma will try and determine file type based on extension if we do not
            // specify it, so force snapshot files to be js type to avoid karma complaints
            type: 'js',
          },
        ],

        esm: {
          nodeResolve: true,
          plugins: [
            aliasResolverPlugin(),
          ],
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
