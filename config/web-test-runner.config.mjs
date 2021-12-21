import { mochaStyleReporter } from '@blockquote/test-runner-mocha-style-reporter';
import { defaultReporter } from '@web/test-runner';
import { puppeteerLauncher } from '@web/test-runner-puppeteer';
import * as path from 'path';
import puppeteer from 'puppeteer';

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

const puppeteerExecutablePath = puppeteer.executablePath();

export default {
  nodeResolve: true,
  coverageConfig: {
    include: ['src/**/*.js'],
    reportDir: 'reports',
    threshold: {
      branches: 80,
    }
  },
  groups: [
    {
      name: 'all',
      files: ['test/unit/**/*.test.js', 'test/storage/**/*.test.js']
    },
    {
      name: 'unit',
      files: 'test/unit/**/*.test.js'
    },
    {
      name: 'single',
      files: 'test/unit/slices/game/game-slice.test.js'
    }
  ],
  // Custom html as a workaround for setting root hooks or global initialization.
  // See https://github.com/modernweb-dev/web/issues/1462.
  testRunnerHtml: testFramework =>
    `<html>
      <body>
        <script type="module" src="/test/unit/helpers/global-setup.js"></script>
        <script type="module" src="${testFramework}"></script>
      </body>
    </html>`,
  browsers: [
    puppeteerLauncher({
      launchOptions: {
        executablePath: puppeteerExecutablePath,
        // args: ['--some-flag'],
      },
    }),
  ],
  plugins: [
    aliasResolverPlugin(),
  ],
  reporters: [
    defaultReporter(),
    mochaStyleReporter(),
  ],
};
