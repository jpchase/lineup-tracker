/**
@license
Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

/* global after, afterEach, before, beforeEach, describe, it */

import { expect } from 'chai';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { PNG } from 'pngjs';
import { Browser, Page, Request } from 'puppeteer';
import { HomePage } from './pages/home-page';
import { PageObject, PageOptions } from './pages/page-object';
import { TeamCreatePage } from './pages/team-create-page';
import { TeamRosterPage } from './pages/team-roster-page';
import { TeamSelectPage } from './pages/team-select-page';
import { serveHermeticFont } from './server/hermetic-fonts';
import { config, DevServer, startTestServer } from './server/test-server';
const pixelmatch = require('pixelmatch');
const puppeteer = require('puppeteer');

let platformName = os.type().toLowerCase();
if (platformName === 'darwin') {
  platformName = 'macos';
} else if (os.hostname() === 'penguin') {
  platformName = 'chromeos';
}

const integrationDir = path.join(process.cwd(), 'test/integration');
const dataDir = path.join(integrationDir, 'data');
const currentDir = path.join(integrationDir, 'screenshots-current', platformName);
const baselineDir = path.join(integrationDir, 'screenshots-baseline', platformName);

const breakpoints = [
  { name: 'wide', viewPort: { width: 800, height: 600 } },
  { name: 'narrow', viewPort: { width: 375, height: 667 } },
];

function getBaselineFile(view: string) {
  return path.join(baselineDir, `${view}.png`);
}

function getCurrentFile(view: string) {
  return path.join(currentDir, `${view}.png`);
}

describe('👀 page screenshots are correct', function () {
  let server: DevServer, browser: Browser, page: Page;
  let pageObject: PageObject;

  before(async function () {
    server = await startTestServer();

    // Create the test directories if needed.
    for (const breakpoint of breakpoints) {
      const dir = path.join(currentDir, breakpoint.name);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  });

  after(async () => await server.stop());

  beforeEach(async function () {
    browser = await puppeteer.launch({ args: ['--disable-gpu', '--font-render-hinting=none'] });
    page = await browser.newPage();

    page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));

    page.on('requestfailed', (request: Request) => {
      console.log('PAGE REQUEST FAIL: [' + request.url() + '] ' + request.failure()!.errorText);
    });

    page.setRequestInterception(true);
    page.on('request', async (request: Request) => {
      const fontResponse = serveHermeticFont(request, dataDir);
      if (fontResponse) {
        request.respond(fontResponse);
      } else {
        request.continue();
      }
    });

    await page.emulateTimezone('America/Toronto');
  });

  afterEach(async () => {
    await browser.close();
    await pageObject?.close();
  });

  for (const breakpoint of breakpoints) {
    describe(`${breakpoint.name} screen`, function () {
      const prefix = breakpoint.name;
      const pageOptions: PageOptions = { viewPort: breakpoint.viewPort };

      beforeEach(async function () {
        return page.setViewport(breakpoint.viewPort);
      });

      it('/index.html', async function () {
        return takeAndCompareScreenshot(page, '', prefix);
      });
      it('/viewHome', async function () {
        const homePage = pageObject = new HomePage(pageOptions);
        return takeAndCompareScreenshot(homePage, 'viewHome', prefix);
      });
      if (prefix === 'narrow') {
        it('navigation drawer', async function () {
          const homePage = pageObject = new HomePage(pageOptions, true);
          return takeAndCompareScreenshot(homePage, '', prefix);
        });
      }
      it('/viewGames', async function () {
        return takeAndCompareScreenshot(page, 'viewGames?team=test_team1', prefix, 'viewGames', null, 'lineup-view-games');
      });
      it('/viewRoster', async function () {
        const rosterPage = pageObject = new TeamRosterPage(pageOptions);
        return takeAndCompareScreenshot(rosterPage, 'viewRoster?team=test_team1', prefix, 'viewRoster', null, 'lineup-view-roster');
      });
      it('/404', async function () {
        return takeAndCompareScreenshot(page, 'batmanNotAView', prefix);
      });

      it('add new team', async function () {
        const addTeamPage = pageObject = new TeamCreatePage(pageOptions);
        return takeAndCompareScreenshot(addTeamPage, '', prefix);
      });

      it('select team', async function () {
        const selectTeamPage = pageObject = new TeamSelectPage(pageOptions);
        return takeAndCompareScreenshot(selectTeamPage, '', prefix);
      });

      it('/game', async function () {
        return takeAndCompareScreenshot(page, 'game/test_game1?team=test_team1', prefix, 'viewGameDetail', null, 'lineup-view-game-detail');
      });
    }); // describe(`${breakpoint.name} screen`)
  }
});

async function takeAndCompareScreenshot(page: Page | PageObject, route: string, filePrefix: string, setupName?: string, setup?: any, waitForSelector?: any) {
  if (page instanceof PageObject) {
    await page.init();
    await page.open();
    const viewName = await page.screenshot(path.join(currentDir, filePrefix));
    // TODO: Pass filePrefix as an explicit parameter.
    return compareScreenshots(path.join(filePrefix, viewName));
  }

  // If you didn't specify a file, use the name of the route.
  const fileName = path.join(filePrefix, (setupName ? setupName : (route ? route : 'index')));

  const testFlagSeparator = (route && route.includes('?')) ? '&' : '?';
  await page.goto(`${config.appUrl}/${route}${testFlagSeparator}test_data`);
  if (setup) {
    await setup(page);
  }
  // TODO: Figure out all screenshots take longer on linux
  // eslint-disable-next-line no-constant-condition
  if (waitForSelector || true) { // waitForSelector) {
    // await page.waitForSelector(waitForSelector);
    await page.waitFor(1500);
  }
  await page.screenshot({ path: getCurrentFile(fileName) });
  return compareScreenshots(fileName);
}

function compareScreenshots(view: string) {
  const baselineFile = getBaselineFile(view);
  const currentFile = getCurrentFile(view);

  return new Promise((resolve) => {
    // Note: for debugging, you can dump the screenshotted img as base64.
    // fs.createReadStream(currentFile, { encoding: 'base64' })
    //   .on('data', function (data) {
    //     console.log('got data', data)
    //   })
    //   .on('end', function () {
    //     console.log('\n\n')
    //   });
    const img1 = fs.createReadStream(currentFile).pipe(new PNG()).on('parsed', doneReading);
    const img2 = fs.createReadStream(baselineFile).pipe(new PNG()).on('parsed', doneReading);

    let filesRead = 0;
    function doneReading() {
      // Wait until both files are read.
      if (++filesRead < 2) return;

      // The files should be the same size.
      expect(img1.width, 'image widths are the same').equal(img2.width);
      expect(img1.height, 'image heights are the same').equal(img2.height);

      // Do the visual diff.
      const diff = new PNG({ width: img1.width, height: img1.height });

      const numDiffPixels = pixelmatch(img1.data, img2.data, diff.data,
        img1.width, img1.height, { threshold: 0.2 });
      const percentDiff = numDiffPixels / (img1.width * img1.height) * 100;

      const stats = fs.statSync(currentFile);
      const fileSizeInBytes = stats.size;
      console.log(`📸 ${view}.png => ${fileSizeInBytes} bytes, ${percentDiff}% different`);

      // diff.pack().pipe(fs.createWriteStream(`${currentDir}/${view}-diff.png`));
      expect(numDiffPixels, 'number of different pixels').equal(0);
      resolve();
    }
  });
}
