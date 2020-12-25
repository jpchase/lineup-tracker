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
import { Browser, Page, Viewport } from 'puppeteer';
import { HomePage } from '../pages/home-page';
import { PageObject, PageOptions } from '../pages/page-object';
import { TeamCreatePage } from '../pages/team-create-page';
import { TeamSelectPage } from '../pages/team-select-page';
import { serveHermeticFont } from '../server/hermetic-fonts';
import { config, startTestServer } from '../server/test-server';
const puppeteer = require('puppeteer');

describe('🎁 regenerate screenshots', function () {
  let server: any, browser: Browser, page: Page;

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

  after((done) => server.close(done));

  beforeEach(async function () {
    browser = await puppeteer.launch({ args: ['--disable-gpu', '--font-render-hinting=none'] });
    page = await browser.newPage();

    page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));

    page.setRequestInterception(true);
    page.on('request', async (request) => {
      const fontResponse = serveHermeticFont(request, config.dataDir);
      if (fontResponse) {
        request.respond(fontResponse);
      } else {
        request.continue();
      }
    });
  });

  afterEach(() => browser.close());

  const breakpoints: Viewport[] = [
    { width: 800, height: 600 },
    { width: 375, height: 667 }];
  const prefixes = ['wide', 'narrow'];

  for (let i = 0; i < prefixes.length; i++) {
    const prefix = prefixes[i];
    const breakpoint = breakpoints[i];
    const pageOptions: PageOptions = { viewPort: breakpoint };

    it(`views - ${prefix}`, async function () {
      return generateBaselineScreenshots(page, prefix, breakpoint);
    });

    if (prefix === 'narrow') {
      it('navigation drawer', async function () {
        const homePage = new HomePage(pageOptions, true);
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

async function generateBaselineScreenshots(page: Page, prefix: string, breakpoint: Viewport) {
  console.log(prefix + '...');
  page.setViewport(breakpoint);
  // Index.
  await page.goto(`${config.appUrl}/?test_data`);
  await page.waitFor(1000);
  await page.screenshot({ path: `${config.baselineDir}/${prefix}/index.png` });
  // Views.
  const views = [
    { name: 'Home', wait: 1000 },
    // TODO: Remove sleep hack to avoid blank page in screenshot
    { name: 'GameDetail', route: 'game/test_game1', setTeam: true, wait: 1000 },
    // TODO: Remove sleep hack to avoid missing icon on FAB in screenshot
    { name: 'Games', setTeam: true, wait: 1000 },
    // TODO: Remove sleep hack to avoid blank page in screenshot
    { name: 'Roster', setTeam: true, wait: 1000 }
  ];
  for (const view of views) {
    let route = view.route ? view.route : `view${view.name}`;
    if (view.setTeam) {
      route += '?team=test_team1';
    }
    console.log(`View: ${view.name}, route: ${route}`);
    const testFlagSeparator = (route && route.includes('?')) ? '&' : '?';
    await page.goto(`${config.appUrl}/${route}${testFlagSeparator}test_data`);
    if (view.wait) {
      console.log(`Wait extra for ${view.name} view`);
      await page.waitFor(view.wait);
    }
    console.log(`Screenshot for view: ${view.name}`);
    await page.screenshot({ path: `${config.baselineDir}/${prefix}/view${view.name}.png` });
  }
  // 404.
  console.log(`Screenshot for 404`);
  await page.goto(`${config.appUrl}/batmanNotAView?test_data`);
  console.log(`Wait extra for 404 view`);
  await page.waitFor(1000);
  await page.screenshot({ path: `${config.baselineDir}/${prefix}/batmanNotAView.png` });
}

async function generateScreenshot(page: PageObject, filePrefix: string) {
  await page.init();
  await page.open();
  await page.screenshot(path.join(config.baselineDir, filePrefix));
  await page.close();
}
