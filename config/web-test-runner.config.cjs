const path = require('path');
const puppeteerLauncher = require('@web/test-runner-puppeteer').puppeteerLauncher;

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

const puppeteerExecutablePath = require('puppeteer').executablePath();

module.exports = {
  nodeResolve: true,
  coverageConfig: {
    include: ['src/**/*.js'],
    threshold: {
      branches: 80,
    }
  },
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
};
