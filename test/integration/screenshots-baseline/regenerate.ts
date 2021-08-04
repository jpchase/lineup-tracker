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

import * as fs from 'fs';
import * as path from 'path';
import { Viewport } from 'puppeteer';
import { ErrorPage } from '../pages/error-page.js';
import { GameDetailPage } from '../pages/game-detail-page.js';
import { GameListPage } from '../pages/game-list-page.js';
import { HomePage, HomePageOptions } from '../pages/home-page.js';
import { PageObject, PageOptions } from '../pages/page-object.js';
import { TeamCreatePage } from '../pages/team-create-page.js';
import { TeamRosterPage } from '../pages/team-roster-page.js';
import { TeamSelectPage } from '../pages/team-select-page.js';
import { config, DevServer, startTestServer } from '../server/test-server.js';

describe('🎁 regenerate screenshots', function () {
  let server: DevServer;

  before(async function () {
    server = await startTestServer();

    // Create the test directory if needed.
    if (!fs.existsSync(config.baselineDir)) {
      fs.mkdirSync(config.baselineDir);
    }
    // And it's subdirectories.
    if (!fs.existsSync(`${config.baselineDir}/wide`)) {
      fs.mkdirSync(`${config.baselineDir}/wide`);
    }
    if (!fs.existsSync(`${config.baselineDir}/narrow`)) {
      fs.mkdirSync(`${config.baselineDir}/narrow`);
    }
  });

  after(async () => server.stop());

  for (const breakpoint of config.breakpoints) {
    const prefix = breakpoint.name;
    const pageOptions: PageOptions = { viewPort: breakpoint.viewPort };

    it(`views - ${prefix}`, async function () {
      return generateBaselineScreenshots(prefix, breakpoint.viewPort);
    });

    if (prefix === 'narrow') {
      it('navigation drawer', async function () {
        const homeOptions: HomePageOptions = { ...pageOptions, openDrawer: true };
        const homePage = new HomePage(homeOptions);
        return generateScreenshot(homePage, prefix);
      });
    }

    it(`Add team - ${prefix}`, async function () {
      const addTeamPage = new TeamCreatePage(pageOptions);
      return generateScreenshot(addTeamPage, prefix);
    });

    it(`Select team - ${prefix}`, async function () {
      const selectTeamPage = new TeamSelectPage(pageOptions);
      return generateScreenshot(selectTeamPage, prefix);
    });
  }
});

async function generateBaselineScreenshots(prefix: string, breakpoint: Viewport) {
  console.log(prefix + '...');
  const pageOptions: PageOptions = { viewPort: breakpoint };
  // Index.
  const indexOptions: HomePageOptions = {
    ...pageOptions,
    scenarioName: 'index',
    emptyRoute: true
  };
  const indexPage = new HomePage(indexOptions);
  await generateScreenshot(indexPage, prefix);
  // Views.
  const homePage = new HomePage(pageOptions);
  await generateScreenshot(homePage, prefix);
  const gamePage = new GameDetailPage(pageOptions);
  await generateScreenshot(gamePage, prefix);
  const gamesPage = new GameListPage(pageOptions);
  await generateScreenshot(gamesPage, prefix);
  const rosterPage = new TeamRosterPage(pageOptions);
  await generateScreenshot(rosterPage, prefix);
  // 404.
  console.log(`Screenshot for 404`);
  const errorOptions = { ...pageOptions, route: 'batmanNotAView' };
  const error404Page = new ErrorPage(errorOptions);
  await generateScreenshot(error404Page, prefix);
}

async function generateScreenshot(page: PageObject, filePrefix: string) {
  await page.init();
  await page.open();
  await page.screenshot(path.join(config.baselineDir, filePrefix));
  await page.close();
}
