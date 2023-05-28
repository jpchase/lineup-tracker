/** @format */

import { LineupViewRoster } from '@app/components/lineup-view-roster';
import '@app/components/lineup-view-roster.js';
import { expect, fixture, html } from '@open-wc/testing';

describe('lineup-view-roster tests', () => {
  let el: LineupViewRoster;
  beforeEach(async () => {
    el = await fixture(html`<lineup-view-roster active></lineup-view-roster>`);
  });

  it('a11y', async () => {
    await expect(el).to.be.accessible();
  });
});
