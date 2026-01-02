/** @format */

import '@app/components/lineup-view404.js';
import { LineupView404 } from '@app/components/lineup-view404.js';
import { expect, fixture, html } from '@open-wc/testing';

describe('lineup-view404 tests', () => {
  let el: LineupView404;
  beforeEach(async () => {
    el = await fixture(html`<lineup-view404 active></lineup-view404>`);
  });

  it('a11y', async () => {
    await expect(el).to.be.accessible();
  });
});
