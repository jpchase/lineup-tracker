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
const expect = require('chai').expect;
const {startServer} = require('polyserve');
const path = require('path');
const fs = require('fs');
const PNG = require('pngjs').PNG;
const pixelmatch = require('pixelmatch');

const currentDir = `${process.cwd()}/test/integration/screenshots-current`;
const baselineDir = `${process.cwd()}/test/integration/screenshots-baseline`;

const firebaseScriptRegex = new RegExp(/(http:\/\/\d+\.\d+\.\d+\.\d+:\d+\/)?__\/firebase\/\d+\.\d+\.\d+(\/.+)/);

const breakpoints = [
  { name: 'wide', viewPort: {width: 800, height: 600} },
  { name: 'narrow', viewPort: {width: 375, height: 667} },
];

describe('👀 page screenshots are correct', function() {
  let polyserve, browser, page;

  before(async function() {
    polyserve = await startServer({port:4444, root:path.join(__dirname, '../..'), moduleResolution:'node'});

    // Create the test directory if needed.
    if (!fs.existsSync(currentDir)){
      fs.mkdirSync(currentDir);
    }
    // And it's subdirectories.
    if (!fs.existsSync(`${currentDir}/wide`)){
      fs.mkdirSync(`${currentDir}/wide`);
    }
    if (!fs.existsSync(`${currentDir}/narrow`)){
      fs.mkdirSync(`${currentDir}/narrow`);
    }
  });

  after((done) => polyserve.close(done));

  beforeEach(async function() {
    browser = await puppeteer.launch();
    page = await browser.newPage();

    // Override url for Firebase scripts
    await page.setRequestInterception(true);
    page.on('request', request => {
      const scriptMatch = firebaseScriptRegex.exec(request.url());
      if (!scriptMatch) {
        request.continue();
        return;
      }
      const url = scriptMatch[1] + 'node_modules/firebase' + scriptMatch[2];
      request.continue({ url });
    });

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));

    page.on('requestfailed', request => {
      console.log('PAGE REQUEST FAIL: [' + request.url() + '] ' + request.failure().errorText);
    });
  });

  afterEach(() => browser.close());

  for (const breakpoint of breakpoints) {
    describe(`${breakpoint.name} screen`, function() {
      const prefix = breakpoint.name;

      beforeEach(async function() {
        return page.setViewport(breakpoint.viewPort);
      });

      it('/index.html', async function() {
        return takeAndCompareScreenshot(page, '', prefix);
      });
      it('/viewHome', async function() {
        return takeAndCompareScreenshot(page, 'viewHome', prefix);
      });
      it('/viewGames', async function() {
        return takeAndCompareScreenshot(page, 'viewGames', prefix);
      });
      it('/viewRoster', async function() {
        return takeAndCompareScreenshot(page, 'viewRoster', prefix, null, null, 'lineup-view-roster');
      });
      it('/404', async function() {
        return takeAndCompareScreenshot(page, 'batmanNotAView', prefix);
      });

      it('add new team', async function() {
        return takeAndCompareScreenshot(page, '', prefix, 'addNewTeam', async () => {
          await page.evaluate(() => {
            const app = document.querySelector('lineup-app');
            const selector = app.shadowRoot.querySelector('lineup-team-selector');
            const list = selector.shadowRoot.querySelector('paper-dropdown-menu paper-listbox');
            list.select('addnewteam');
          });
        });
      });
    });
  }

});

async function takeAndCompareScreenshot(page, route, filePrefix, setupName, setup, waitForSelector) {
  // If you didn't specify a file, use the name of the route.
  let fileName = filePrefix + '/' + (setupName ? setupName : (route ? route : 'index'));

  await page.goto(`http://127.0.0.1:4444/${route}`);
  if (setup) {
    await setup(page);
  }
  if (waitForSelector) {
    // await page.waitForSelector(waitForSelector);
    await page.waitFor(1000);
  }
  await page.screenshot({path: `${currentDir}/${fileName}.png`});
  return compareScreenshots(fileName);
}

function compareScreenshots(view) {
  return new Promise((resolve, reject) => {
    // Note: for debugging, you can dump the screenshotted img as base64.
    // fs.createReadStream(`${currentDir}/${view}.png`, { encoding: 'base64' })
    //   .on('data', function (data) {
    //     console.log('got data', data)
    //   })
    //   .on('end', function () {
    //     console.log('\n\n')
    //   });
    const img1 = fs.createReadStream(`${currentDir}/${view}.png`).pipe(new PNG()).on('parsed', doneReading);
    const img2 = fs.createReadStream(`${baselineDir}/${view}.png`).pipe(new PNG()).on('parsed', doneReading);

    let filesRead = 0;
    function doneReading() {
      // Wait until both files are read.
      if (++filesRead < 2) return;

      // The files should be the same size.
      expect(img1.width, 'image widths are the same').equal(img2.width);
      expect(img1.height, 'image heights are the same').equal(img2.height);

      // Do the visual diff.
      const diff = new PNG({width: img1.width, height: img1.height});

      // Skip the bottom/rightmost row of pixels, since it seems to be
      // noise on some machines :/
      const width = img1.width - 1;
      const height = img1.height - 1;

      const numDiffPixels = pixelmatch(img1.data, img2.data, diff.data,
          width, height, {threshold: 0.2});
      const percentDiff = numDiffPixels/(width * height)*100;

      const stats = fs.statSync(`${currentDir}/${view}.png`);
      const fileSizeInBytes = stats.size;
      console.log(`📸 ${view}.png => ${fileSizeInBytes} bytes, ${percentDiff}% different`);

      //diff.pack().pipe(fs.createWriteStream(`${currentDir}/${view}-diff.png`));
      expect(numDiffPixels, 'number of different pixels').equal(0);
      resolve();
    }
  });
}
