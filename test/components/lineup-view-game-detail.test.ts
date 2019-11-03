import { LineupViewGameDetail } from '@app/components/lineup-view-game-detail';
import '@app/components/lineup-view-game-detail.js';
import { expect, fixture } from '@open-wc/testing';

describe('lineup-view-game-detail tests', () => {
  let el: LineupViewGameDetail;
  beforeEach(async () => {
    el = await fixture('<lineup-view-game-detail active></lineup-view-game-detail>');
  });

  it('shows no game placeholder when no current game', () => {
    const placeholder = el.shadowRoot!.querySelector('section p.empty-list');
    expect(placeholder, 'Missing empty placeholder element').to.be.ok;
  });

  it('a11y', async () => {
    await expect(el).to.be.accessible();
  });
});
