/** @format */

import { mochaStyleReporter } from '@blockquote/test-runner-mocha-style-reporter';
import { defaultReporter, formatError } from '@web/test-runner';
import { puppeteerLauncher } from '@web/test-runner-puppeteer';
import { bold, red } from 'nanocolors';
import * as path from 'path';
import puppeteer from 'puppeteer';
import { SESSION_STATUS } from '@web/test-runner-core';

const OUT_DIR = 'out-tsc';

const filteredLogs = ['Running in dev mode', 'Lit is in dev mode'];

function aliasResolverPlugin() {
  return {
    async resolveImport({ source, context }) {
      if (!source.startsWith('@app/')) {
        return undefined;
      }
      const requestedFile = context.path.endsWith('/') ? `${context.path}index.html` : context.path;
      // Compute depth of file containing the import, based on path separators.
      //  - e.g. file path = "/out-tsc/test/unit/..."
      //  - Subtract 3 from separator count =
      //     1 for leading slash +
      //     1 for "out-tsc" (out dir for .js files compiled from .ts) +
      //     1 for the dir containing the file (i.e. <leaf dir>/<file>)
      const depth = requestedFile.split('/').length - 3;
      let extension = path.extname(source);
      if (!extension || extension.length === 0) {
        // Default the extension, otherwise it won't resolve.
        extension = '.js';
      } else {
        // Has an extension, which will already be included in the result.
        extension = '';
      }
      const browserPath = `${'../'.repeat(depth)}src/${source.substring(5)}${extension}`;
      console.log(`mapped [${source}] to [${browserPath}] in [${requestedFile}]`);
      return browserPath;
    },
  };
}

function getFailedTestList(testResults /*: TestSuiteResult*/) {
  const failed = [];

  function collectTests(suiteName, tests /*: TestResult[]*/) {
    for (const test of tests) {
      if (test.passed || test.skipped) {
        continue;
      }
      let errorDetails = '';
      if (test.error) {
        errorDetails = `\n${formatError(test.error)}`;
      }
      failed.push(`${suiteName} > ${test.name}${errorDetails}`);
    }
  }

  function collectSuite(suite /*: TestSuiteResult*/) {
    collectTests(suite.name, suite.tests);

    for (const childSuite of suite.suites) {
      collectSuite(childSuite);
    }
  }

  collectSuite(testResults);

  return failed;
}

export function testFailureSummaryReporter() {
  let args;

  return {
    start(_args) {
      args = _args;
    },
    getTestProgress({ testRun, focusedTestFile, _testCoverage }) {
      function getTestFailureReport(progressArgs /*: TestProgressArgs*/) {
        const { browsers, sessions } = progressArgs;
        const entries = [];
        const unfinishedSessions = Array.from(
          sessions.forStatusAndTestFile(
            focusedTestFile,
            SESSION_STATUS.SCHEDULED,
            SESSION_STATUS.INITIALIZING,
            SESSION_STATUS.TEST_STARTED,
            SESSION_STATUS.TEST_FINISHED,
          ),
        );

        const failedTests = [];

        for (const browser of browsers) {
          const allSessionsForBrowser = Array.from(sessions.forBrowser(browser));
          const sessionsForBrowser = focusedTestFile
            ? allSessionsForBrowser.filter((s) => s.testFile === focusedTestFile)
            : allSessionsForBrowser;

          for (const session of sessionsForBrowser) {
            if (session.status === SESSION_STATUS.FINISHED && session.testResults) {
              const sessionFailedTests = getFailedTestList(session.testResults);
              if (sessionFailedTests.length > 0) {
                failedTests.push(...sessionFailedTests);
              }
            }
          }
        }

        if (testRun !== -1 && unfinishedSessions.length === 0 && failedTests.length > 0) {
          entries.push(bold(red(`Tests with failures:`)));
          failedTests.forEach((testFailure) => {
            entries.push(` ❌ ${testFailure}`);
          });
          entries.push('');
        }

        return entries;
      }

      // console.log(`about to call getTestFailureReport`);
      return getTestFailureReport({
        browsers: args.browsers,
        testRun,
        sessions: args.sessions,
        focusedTestFile,
      });
    },
  };
}

const puppeteerExecutablePath = puppeteer.executablePath();

const TEST_DIR = `${OUT_DIR}/test`;
const storageTestFiles = `${TEST_DIR}/storage/**/*.test.js`;
const unitTestFiles = `${TEST_DIR}/unit/**/*.test.js`;

/** @type {import("@web/test-runner").TestRunnerConfig} */
export default {
  nodeResolve: true,
  // debug: true,
  coverageConfig: {
    include: [`${OUT_DIR}/src/**/*.js`],
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
      files: `${TEST_DIR}/unit/components/lineup-game-events.test.js`,
      // files: `${TEST_DIR}/unit/models/shift-tracker-event-builder.test.js`,
      // files: `${TEST_DIR}/unit/models/shift.test.js`,
      // files: `${TEST_DIR}/unit/slices/live/events-slice.test.js`,
      // files: `${TEST_DIR}/unit/slices/live/clock-reducer-logic.test.js`,
      // files: `${TEST_DIR}/unit/slices/live/substition-reducer-logic.test.js`,
      // files: `${TEST_DIR}/unit/slices/live/**.test.js`
    },
  ],
  // Custom html as a workaround for setting root hooks or global initialization.
  // See https://github.com/modernweb-dev/web/issues/1462.
  testRunnerHtml: (testFramework) =>
    `<html>
      <body>
        <script type="module" src="${TEST_DIR}/unit/helpers/global-setup.js"></script>
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
  reporters: [defaultReporter(), mochaStyleReporter(), testFailureSummaryReporter()],
};
