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

const puppeteer = require('puppeteer');
const { createConfig, startServer } = require('es-dev-server');
const path = require('path');
const fs = require('fs');

const baselineDir = `${process.cwd()}/test/integration/screenshots-baseline`;

describe('🎁 regenerate screenshots', function () {
  let server, browser, page;

  before(async function () {
    const config = createConfig({
      port: 4444,
      nodeResolve: true,
      appIndex: 'local.index.html',
    });
    ({ server } = await startServer(config));

    // Create the test directory if needed.
    if (!fs.existsSync(baselineDir)) {
      fs.mkdirSync(baselineDir);
    }
    // And it's subdirectories.
    if (!fs.existsSync(`${baselineDir}/wide`)) {
      fs.mkdirSync(`${baselineDir}/wide`);
    }
    if (!fs.existsSync(`${baselineDir}/narrow`)) {
      fs.mkdirSync(`${baselineDir}/narrow`);
    }
  });

  after(() => server.close());

  beforeEach(async function () {
    browser = await puppeteer.launch();
    page = await browser.newPage();

    page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
  });

  afterEach(() => browser.close());

  const breakpoints = [
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

async function generateBaselineScreenshots(page, prefix, breakpoint) {
  console.log(prefix + '...');
  page.setViewport(breakpoint);
  // Index.
  await page.goto('http://127.0.0.1:4444/');
  await page.screenshot({ path: `${baselineDir}/${prefix}/index.png` });
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
    await page.goto(`http://127.0.0.1:4444/${route}`);
    if (view.wait) {
      console.log(`Wait extra for ${view.name} view`);
      await page.waitFor(view.wait);
    }
    console.log(`Screenshot for view: ${view.name}`);
    await page.screenshot({ path: `${baselineDir}/${prefix}/view${view.name}.png` });
  }
  // 404.
  console.log(`Screenshot for 404`);
  await page.goto('http://127.0.0.1:4444/batmanNotAView');
  await page.screenshot({ path: `${baselineDir}/${prefix}/batmanNotAView.png` });
}

async function generateAddTeamScreenshots(page, prefix, breakpoint) {
  page.setViewport(breakpoint);

  // Add new team
  await page.goto('http://127.0.0.1:4444/');
  await page.evaluate(() => {
    const app = document.querySelector('lineup-app');
    const selector = app.shadowRoot.querySelector('lineup-team-selector');
    const list = selector.shadowRoot.querySelector('paper-dropdown-menu paper-listbox');
    list.select('addnewteam');
  });
  await page.screenshot({ path: `${baselineDir}/${prefix}/addNewTeam.png` });
}
