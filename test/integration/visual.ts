/** @format */

import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { logWithTime, PageObject } from './pages/page-object.js';
import { createScreenshotDirectories, getAllVisualPages } from './pages/visual-page-factory.js';
import { config } from './server/test-server.js';

function getBaselineFile(view: string) {
  return path.join(config.baselineDir, `${view}.png`);
}

function getCurrentFile(view: string) {
  return path.join(config.currentDir, `${view}.png`);
}

describe('👀 page screenshots are correct', () => {
  let pageObject: PageObject;

  before(async () => {
    // Create the test directories if needed.
    createScreenshotDirectories('current');
  });

  afterEach(async () => {
    await pageObject?.close();
  });

  for (const breakpoint of config.breakpoints) {
    describe(`${breakpoint.name} screen`, () => {
      for (const pageConfig of getAllVisualPages(breakpoint)) {
        it(pageConfig.name, async () => {
          if (pageConfig.page instanceof PageObject) {
            pageObject = pageConfig.page;
            logWithTime(`load page (${pageConfig.name}) - init`);
            await pageObject.init();
            logWithTime(`load page (${pageConfig.name}) - open`);
            await pageObject.open(pageConfig.openOptions);
          } else {
            const builder = pageConfig.page;
            logWithTime(`load page (${pageConfig.name}) - builder`);
            pageObject = await builder.create(builder.options);
          }
          await takeAndCompareScreenshot(pageObject, breakpoint.name);

          const result = await pageObject.checkAccessibility();
          logWithTime(
            `${breakpoint.name}-${pageConfig.name}: ${result.violationCount} accessibility violations`
          );
          expect(result.violationCount, result.violationMessage).to.equal(0);
        });
      }
    }); // describe(`${breakpoint.name} screen`)
  }
});

async function takeAndCompareScreenshot(page: PageObject, filePrefix: string) {
  logWithTime(`tACS (${page.scenarioName}) - screenshot`);
  const viewName = await page.screenshot(path.join(config.currentDir, filePrefix));
  // TODO: Pass filePrefix as an explicit parameter.
  logWithTime(`tACS (${page.scenarioName}) - compare`);
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
      filesRead += 1;
      if (filesRead < 2) return;

      // The files should be the same size.
      expect(img1.width, 'image widths are the same').equal(img2.width);
      expect(img1.height, 'image heights are the same').equal(img2.height);

      // Do the visual diff.
      const diff = new PNG({ width: img1.width, height: img1.height });

      const numDiffPixels = pixelmatch(img1.data, img2.data, diff.data, img1.width, img1.height, {
        threshold: 0.2,
      });
      const percentDiff = (numDiffPixels / (img1.width * img1.height)) * 100;

      const stats = fs.statSync(currentFile);
      const fileSizeInBytes = stats.size;
      // eslint-disable-next-line no-console
      console.log(`📸 ${view}.png => ${fileSizeInBytes} bytes, ${percentDiff}% different`);

      // diff.pack().pipe(fs.createWriteStream(`${currentDir}/${view}-diff.png`));
      expect(numDiffPixels, 'number of different pixels').equal(0);
      resolve();
    }
  });
}
