import { LineupViewGames } from '@app/components/lineup-view-games';
import '@app/components/lineup-view-games.js';
import { Games } from '@app/models/game.js';
import { getGameStoreConfigurator } from '@app/slices/game-store';
import { getGames } from '@app/slices/game/game-slice.js';
import { resetState, store } from '@app/store';
import { expect, fixture, html } from '@open-wc/testing';
import { buildGames, getNewGame, getStoredGame } from '../helpers/test_data.js';

function getExistingGames(): Games {
  return buildGames([getStoredGame(), getNewGame()]);
}

describe('lineup-view-games tests', () => {
  let el: LineupViewGames;
  beforeEach(async () => {
    // Resets to the initial store state.
    store.dispatch(resetState());

    const template = html`<lineup-view-games active .store=${store} .storeConfigurator=${getGameStoreConfigurator(false)}></lineup-view-games>`;
    el = await fixture(template);
  });

  it.skip('shows no games placeholder when team has no games', async () => {
    const gameState = store.getState().game;
    expect(gameState).to.be.ok;
    expect(gameState!.games, 'GameState should have games empty').to.be.empty;

    const placeholder = el.shadowRoot!.querySelector('section p.empty-list');
    expect(placeholder, 'Missing empty placeholder element').to.be.ok;

    await expect(el).shadowDom.to.equalSnapshot();
  });

  it('shows games list when the team has games', async () => {
    const games = getExistingGames();

    store.dispatch({ type: getGames.fulfilled.type, payload: games });
    await el.updateComplete;

    const listElement = el.shadowRoot!.querySelector('section lineup-game-list');
    expect(listElement, 'Game list element should be shown').to.be.ok;

    await expect(el).shadowDom.to.equalSnapshot();
    await expect(el).to.be.accessible();
  });

  it('a11y', async () => {
    await expect(el).to.be.accessible();
  });
});
