/** @format */

import { mochaStyleReporter } from '@blockquote/test-runner-mocha-style-reporter';
import { defaultReporter } from '@web/test-runner';
import { puppeteerLauncher } from '@web/test-runner-puppeteer';
import * as path from 'path';
import puppeteer from 'puppeteer';

function aliasResolverPlugin() {
  return {
    async resolveImport({ source, context }) {
      if (!source.startsWith('@app/')) {
        return undefined;
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
    },
  };
}

const puppeteerExecutablePath = puppeteer.executablePath();

const storageTestFiles = 'test/storage/**/*.test.js';
const unitTestFiles = 'test/unit/**/*.test.js';

export default {
  nodeResolve: true,
  // debug: true,
  coverageConfig: {
    include: ['src/**/*.js'],
    reportDir: 'reports',
    threshold: {
      branches: 80,
    },
  },
  groups: [
    {
      name: 'all',
      files: [unitTestFiles, storageTestFiles],
    },
    {
      name: 'unit',
      files: unitTestFiles,
    },
    {
      name: 'storage',
      files: storageTestFiles,
    },
    {
      name: 'single',
      files: 'test/unit/components/lineup-game-events.test.js',
      // files: 'test/unit/slices/live/substition-reducer-logic.test.js'
      // files: 'test/unit/slices/live/**.test.js'
    },
  ],
  // Custom html as a workaround for setting root hooks or global initialization.
  // See https://github.com/modernweb-dev/web/issues/1462.
  testRunnerHtml: (testFramework) =>
    `<html>
      <body>
        <script type="module" src="/test/unit/helpers/global-setup.js"></script>
        <script type="module" src="${testFramework}"></script>
      </body>
    </html>`,
  browsers: [
    // Use the installed version of Puppeteer, to be consistent with integration tests.
    puppeteerLauncher({
      launchOptions: {
        executablePath: puppeteerExecutablePath,
        // args: ['--some-flag'],
      },
    }),
  ],
  plugins: [aliasResolverPlugin()],
  reporters: [defaultReporter(), mochaStyleReporter()],
};
