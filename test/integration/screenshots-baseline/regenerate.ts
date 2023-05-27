/** @format */

import * as path from 'path';
import { PageObject, logWithTime } from '../pages/page-object.js';
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
          let page: PageObject;
          if (pageConfig.page instanceof PageObject) {
            page = pageConfig.page;
            logWithTime(`load page (${pageConfig.name}) - init`);
            await page.init();
            logWithTime(`load page (${pageConfig.name}) - open`);
            await page.open(pageConfig.openOptions);
          } else {
            const builder = pageConfig.page;
            logWithTime(`load page (${pageConfig.name}) - builder`);
            page = await builder.create(builder.options);
          }
          return generateScreenshot(page, breakpoint.name);
        });
      }
    }); // describe(`${breakpoint.name} viewport`
  }
});

async function generateScreenshot(page: PageObject, filePrefix: string) {
  await page.screenshot(path.join(config.baselineDir, filePrefix));
  await page.close();
}
