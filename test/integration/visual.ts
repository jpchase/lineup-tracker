/**
@license
Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { OpenOptions, PageObject } from './pages/page-object.js';
import { createScreenshotDirectories, getAllVisualPages } from './pages/visual-page-factory.js';
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
    createScreenshotDirectories('current');
  });

  after(async () => await server.stop());

  afterEach(async () => {
    await pageObject?.close();
  });

  for (const breakpoint of config.breakpoints) {

    describe(`${breakpoint.name} screen`, function () {

      for (const pageConfig of getAllVisualPages(breakpoint)) {
        it(pageConfig.name, async function () {
          pageObject = pageConfig.page;
          await takeAndCompareScreenshot(pageObject, breakpoint.name, pageConfig.openOptions);

          const result = await pageObject.checkAccessibility();
          console.log(`${breakpoint.name}-${pageConfig.name}: ${result.violationCount} accessibility violations`);
          expect(result.violationCount, result.violationMessage).to.equal(0);
        });
      }
    }); // describe(`${breakpoint.name} screen`)
  }
});

async function takeAndCompareScreenshot(page: PageObject, filePrefix: string, openOptions?: OpenOptions) {
  await page.init();
  await page.open(openOptions);
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
