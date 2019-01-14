/**
@license
Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

const puppeteer = require('puppeteer');
const {startServer} = require('polyserve');
const path = require('path');
const fs = require('fs');
const baselineDir = `${process.cwd()}/test/integration/screenshots-baseline`;

describe('🎁 regenerate screenshots', function() {
  let polyserve, browser, page;

  before(async function() {
    polyserve = await startServer({port:4444, root:path.join(__dirname, '../../..'), moduleResolution:'node'});

    // Create the test directory if needed.
    if (!fs.existsSync(baselineDir)){
      fs.mkdirSync(baselineDir);
    }
    // And it's subdirectories.
    if (!fs.existsSync(`${baselineDir}/wide`)){
      fs.mkdirSync(`${baselineDir}/wide`);
    }
    if (!fs.existsSync(`${baselineDir}/narrow`)){
      fs.mkdirSync(`${baselineDir}/narrow`);
    }
  });

  after((done) => polyserve.close(done));

  beforeEach(async function() {
    browser = await puppeteer.launch();
    page = await browser.newPage();
  });

  afterEach(() => browser.close());

  const breakpoints = [
      {width: 800, height: 600},
      {width: 375, height: 667}];
  const prefixes = ['wide', 'narrow'];

  for (let i = 0; i < prefixes.length; i++) {
    const prefix = prefixes[i];
    const breakpoint = breakpoints[i];

    it(`views - ${prefix}`, async function() {
      return generateBaselineScreenshots(page, prefix, breakpoint);
    });

    it(`Add team - ${prefix}`, async function() {
      return generateAddTeamScreenshots(page, prefix, breakpoint);
    });
  }
});

async function generateBaselineScreenshots(page, prefix, breakpoint) {
    console.log(prefix + '...');
    page.setViewport(breakpoint);
    // Index.
    await page.goto('http://127.0.0.1:4444/');
    await page.screenshot({path: `${baselineDir}/${prefix}/index.png`});
    // Views.
    const views = ['Home', 'Games', 'Roster'];
    for (const view of views) {
      console.log(`View: ${view}`);
      await page.goto(`http://127.0.0.1:4444/view${view}`);
      if (view === 'Roster') {
        console.log(`Wait extra for Roster view`);
        // TODO: Remove sleep hack to avoid blank page in screenshot
        await page.waitFor(1000);
      }
      console.log(`Screenshot for view: ${view}`);
      await page.screenshot({path: `${baselineDir}/${prefix}/view${view}.png`});
    }
    // 404.
    console.log(`Screenshot for 404`);
    await page.goto('http://127.0.0.1:4444/batmanNotAView');
    await page.screenshot({path: `${baselineDir}/${prefix}/batmanNotAView.png`});
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
    await page.screenshot({path: `${baselineDir}/${prefix}/addNewTeam.png`});
}
