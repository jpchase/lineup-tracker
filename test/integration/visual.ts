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
import * as path from 'path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { ErrorPage } from './pages/error-page.js';
import { GameDetailPage } from './pages/game-detail-page.js';
import { GameListPage } from './pages/game-list-page.js';
import { HomePage, HomePageOptions } from './pages/home-page.js';
import { PageObject, PageOptions } from './pages/page-object.js';
import { TeamCreatePage } from './pages/team-create-page.js';
import { TeamRosterPage } from './pages/team-roster-page.js';
import { TeamSelectPage } from './pages/team-select-page.js';
import { config, DevServer, startTestServer } from './server/test-server.js';

function getBaselineFile(view: string) {
  return path.join(config.baselineDir, `${view}.png`);
}

function getCurrentFile(view: string) {
  return path.join(config.currentDir, `${view}.png`);
}

describe('👀 page screenshots are correct', function () {
  let server: DevServer;
  let pageObject: PageObject;

  before(async function () {
    server = await startTestServer();

    // Create the test directories if needed.
    for (const breakpoint of config.breakpoints) {
      const dir = path.join(config.currentDir, breakpoint.name);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  });

  after(async () => await server.stop());

  afterEach(async () => {
    await pageObject?.close();
  });

  for (const breakpoint of config.breakpoints) {
    describe(`${breakpoint.name} screen`, function () {
      const prefix = breakpoint.name;
      const pageOptions: PageOptions = { viewPort: breakpoint.viewPort };

      it('/index.html', async function () {
        const indexOptions: HomePageOptions = {
          ...pageOptions,
          scenarioName: 'index',
          emptyRoute: true
        };
        const homePage = pageObject = new HomePage(indexOptions);
        return takeAndCompareScreenshot(homePage, prefix);
      });
      it('/viewHome', async function () {
        const homePage = pageObject = new HomePage(pageOptions);
        return takeAndCompareScreenshot(homePage, prefix);
      });
      if (prefix === 'narrow') {
        it('navigation drawer', async function () {
          const homeOptions: HomePageOptions = { ...pageOptions, openDrawer: true };
          const homePage = pageObject = new HomePage(homeOptions);
          return takeAndCompareScreenshot(homePage, prefix);
        });
      }
      it('/viewGames', async function () {
        const gamesPage = pageObject = new GameListPage(pageOptions);
        return takeAndCompareScreenshot(gamesPage, prefix);
      });
      it('/viewRoster', async function () {
        const rosterPage = pageObject = new TeamRosterPage(pageOptions);
        return takeAndCompareScreenshot(rosterPage, prefix);
      });
      it('/404', async function () {
        const errorOptions = { ...pageOptions, route: 'batmanNotAView' };
        const error404Page = pageObject = new ErrorPage(errorOptions);
        return takeAndCompareScreenshot(error404Page, prefix);
      });

      it('add new team', async function () {
        const addTeamPage = pageObject = new TeamCreatePage(pageOptions);
        return takeAndCompareScreenshot(addTeamPage, prefix);
      });

      it('select team', async function () {
        const selectTeamPage = pageObject = new TeamSelectPage(pageOptions);
        return takeAndCompareScreenshot(selectTeamPage, prefix);
      });

      it('/game', async function () {
        const gamePage = pageObject = new GameDetailPage(pageOptions);
        return takeAndCompareScreenshot(gamePage, prefix);
      });
    }); // describe(`${breakpoint.name} screen`)
  }
});

async function takeAndCompareScreenshot(page: PageObject, filePrefix: string) {
  await page.init();
  await page.open();
  const viewName = await page.screenshot(path.join(config.currentDir, filePrefix));
  // TODO: Pass filePrefix as an explicit parameter.
  return compareScreenshots(path.join(filePrefix, viewName));
}

function compareScreenshots(view: string) {
  const baselineFile = getBaselineFile(view);
  const currentFile = getCurrentFile(view);

  return new Promise<void>((resolve) => {
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
