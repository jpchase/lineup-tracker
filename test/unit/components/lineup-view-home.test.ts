/** @format */

import { LineupViewHome } from '@app/components/lineup-view-home';
import '@app/components/lineup-view-home.js';
import { expect, fixture, html } from '@open-wc/testing';

describe('lineup-view-home tests', () => {
  let el: LineupViewHome;
  beforeEach(async () => {
    el = await fixture(html`<lineup-view-home active></lineup-view-home>`);
  });

  it('a11y', async () => {
    await expect(el).to.be.accessible();
  });
});
