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

import { expect } from 'chai';
import puppeteer, { Browser, Page } from 'puppeteer';
import { config, DevServer, startTestServer } from './server/test-server.js';

describe('routing tests', function () {
  let server: DevServer, browser: Browser, page: Page;

  before(async function () {
    server = await startTestServer();
  });

  after(async () => await server.stop());

  beforeEach(async function () {
    browser = await puppeteer.launch();
    page = await browser.newPage();
  });

  afterEach(() => browser.close());

  it('the page selector switches pages', async function () {
    await page.goto(`${config.appUrl}`);
    await page.waitForSelector('lineup-app', { visible: true });

    await testNavigation(page, 'viewGames', 'Games');
    await testNavigation(page, 'viewRoster', 'Roster');
    await testNavigation(page, 'viewHome', 'Overview');
  });

  it('the page selector switches pages in a different way', async function () {
    await page.goto(`${config.appUrl}`);
    await page.waitForSelector('lineup-app', { visible: true });

    await testNavigationInADifferentWay(page, 'viewGames', 'Games');
    await testNavigationInADifferentWay(page, 'viewRoster', 'Roster');
    await testNavigationInADifferentWay(page, 'viewHome', 'Overview');
  });
});

async function testNavigation(page: Page, href: string, linkText: string) {
  // Shadow DOM helpers.
  const getShadowRootChildProp = (el: any, childSelector: string, prop: string) => {
    return el.shadowRoot.querySelector(childSelector)[prop];
  };
  const doShadowRootClick = (el: any, childSelector: string) => {
    return el.shadowRoot.querySelector(childSelector).click();
  };

  const selector = `a[href="/${href}"]`;

  // Does the link say the right thing?
  const myApp = await page.$('lineup-app');
  const myText = await page.evaluate(getShadowRootChildProp, myApp, selector, 'textContent');
  expect(await myText).equal(linkText);

  // Does the click take you to the right page?
  const [] = await Promise.all([
    page.waitForNavigation(), // The promise resolves after navigation has finished
    page.evaluate(doShadowRootClick, myApp, selector),
  ]);
  const newUrl = await page.evaluate('window.location.href');
  expect(newUrl).equal(`${config.appUrl}/${href}`);
}

async function testNavigationInADifferentWay(page: Page, href: string, linkText: string) {
  const deepQuerySelector = (query: string) => {
    const parts = query.split('::shadow');
    let el: Document | Element | ShadowRoot = document;
    for (let i = 0; i < parts.length; i++) {
      el = el.querySelector(parts[i])!;
      if (i % 2 === 0) {
        el = el.shadowRoot!;
      }
    }
    return el === document ? null : el;
  };
  const query = `lineup-app::shadow a[href="/${href}"]`;

  const linkHandle = await page.evaluateHandle(deepQuerySelector, query);
  const text = await page.evaluate((el) => el.textContent, linkHandle);
  expect(text).equal(linkText);

  const [] = await Promise.all([
    page.waitForNavigation(), // The promise resolves after navigation has finished
    page.evaluate((el) => el.click(), linkHandle), // Clicking the link will indirectly cause a navigation
  ]);
  const newUrl = await page.evaluate('window.location.href');
  expect(newUrl).equal(`${config.appUrl}/${href}`);
}
