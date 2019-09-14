import { html, fixture, expect } from '@open-wc/testing';

import '../../src/components/lineup-roster-item.js';

describe('<lineup-roster-item>', () => {
  it('starts empty', async () => {
    const el = await fixture('<lineup-roster-item></lineup-roster-item>');

    expect(el.isGame).to.be.false;
    expect(el.player).to.be.undefined;
  });
});
