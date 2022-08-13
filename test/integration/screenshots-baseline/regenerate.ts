/**
@license
Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import * as path from 'path';
import { OpenOptions, PageObject } from '../pages/page-object.js';
import { createScreenshotDirectories, getAllVisualPages } from '../pages/visual-page-factory.js';
import { config, DevServer, startTestServer } from '../server/test-server.js';

describe('🎁 regenerate screenshots', function () {
  let server: DevServer;

  before(async function () {
    server = await startTestServer();

    // Create the test directories, if needed.
    createScreenshotDirectories('baseline');
  });

  after(async () => server.stop());

  for (const breakpoint of config.breakpoints) {
    describe(`${breakpoint.name} viewport`, function () {
      for (const pageConfig of getAllVisualPages(breakpoint)) {
        it(pageConfig.name, async function () {
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
