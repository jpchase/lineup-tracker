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

import { Browser, Page, Viewport } from 'puppeteer';
const puppeteer = require('puppeteer');
const { config, startTestServer } = require('../server/test-server');
const fs = require('fs');
const hf = require('../../helpers/hermetic-fonts');

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
    browser = await puppeteer.launch();
    page = await browser.newPage();

    page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));

    page.setRequestInterception(true);
    page.on('request', async (request) => {
      const fontResponse = hf.serveHermeticFont(request, config.dataDir);
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

    it(`views - ${prefix}`, async function () {
      return generateBaselineScreenshots(page, prefix, breakpoint);
    });

    it(`Add team - ${prefix}`, async function () {
      return generateAddTeamScreenshots(page, prefix, breakpoint);
    });
  }
});

async function generateBaselineScreenshots(page: Page, prefix: string, breakpoint: Viewport) {
  console.log(prefix + '...');
  page.setViewport(breakpoint);
  // Index.
  await page.goto(`${config.appUrl}/?test_data`);
  await page.screenshot({ path: `${config.baselineDir}/${prefix}/index.png` });
  // Views.
  const views = [
    { name: 'Home' },
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
  await page.screenshot({ path: `${config.baselineDir}/${prefix}/batmanNotAView.png` });
}

async function generateAddTeamScreenshots(page: Page, prefix: string, breakpoint: Viewport) {
  page.setViewport(breakpoint);

  // Add new team
  await page.goto(`${config.appUrl}?test_data`);
  await page.evaluate(() => {
    const app = document.querySelector('lineup-app');
    const selector = app!.shadowRoot!.querySelector('lineup-team-selector');
    const list = selector!.shadowRoot!.querySelector('paper-dropdown-menu paper-listbox');
    (list as any).select('addnewteam');
  });
  await page.screenshot({ path: `${config.baselineDir}/${prefix}/addNewTeam.png` });
}
