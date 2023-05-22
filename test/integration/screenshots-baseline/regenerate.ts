/** @format */

import * as path from 'path';
import { OpenOptions, PageObject } from '../pages/page-object.js';
import { createScreenshotDirectories, getAllVisualPages } from '../pages/visual-page-factory.js';
import { config } from '../server/test-server.js';

describe('🎁 regenerate screenshots', () => {
  before(async () => {
    // Create the test directories, if needed.
    createScreenshotDirectories('baseline');
  });

  for (const breakpoint of config.breakpoints) {
    describe(`${breakpoint.name} viewport`, () => {
      for (const pageConfig of getAllVisualPages(breakpoint)) {
        it(pageConfig.name, async () => {
          return generateScreenshot(pageConfig.page, breakpoint.name, pageConfig.openOptions);
        });
      }
    }); // describe(`${breakpoint.name} viewport`
  }
});

async function generateScreenshot(page: PageObject, filePrefix: string, openOptions?: OpenOptions) {
  await page.init();
  await page.open(openOptions);
  await page.screenshot(path.join(config.baselineDir, filePrefix));
  await page.close();
}
