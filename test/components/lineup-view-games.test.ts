import { LineupViewGames } from '@app/components/lineup-view-games';
import '@app/components/lineup-view-games.js';
import { expect, fixture } from '@open-wc/testing';

describe('lineup-view-games tests', () => {
  let el: LineupViewGames;
  beforeEach(async () => {
    el = await fixture('<lineup-view-games active></lineup-view-games>');
  });

  it('a11y', async () => {
    await expect(el).to.be.accessible();
  });
});
