import '@app/components/lineup-game-complete.js';
import { LineupGameComplete } from '@app/components/lineup-game-complete.js';
import { GameDetail, GameStatus } from '@app/models/game.js';
import { LiveGame } from '@app/models/live.js';
import { getLiveStoreConfigurator } from '@app/slices/live-store.js';
import { RootState, setupStore } from '@app/store.js';
import { expect, fixture, html } from '@open-wc/testing';
import { buildGameStateWithCurrentGame } from '../helpers/game-state-setup.js';
import { buildLiveStateWithCurrentGame, buildShiftWithTrackersFromGame } from '../helpers/live-state-setup.js';
import { buildRootState } from '../helpers/root-state-setup.js';
import * as testlive from '../helpers/test-live-game-data.js';
import { buildRoster, getNewGameDetail } from '../helpers/test_data.js';

function getGameDetail(): { game: GameDetail, live: LiveGame } {
  const live = testlive.getLiveGameWithPlayers();
  const game = getNewGameDetail(buildRoster(live.players));
  game.status = live.status = GameStatus.Done;
  return { game, live };
}

describe('lineup-game-complete tests', () => {
  let el: LineupGameComplete;

  beforeEach(async () => {
    await setupElement();
  });

  async function setupElement(preloadedState?: RootState, gameId?: string) {
    const store = setupStore(preloadedState, /*hydrate=*/false);

    const template = html`<lineup-game-complete .gameId="${gameId}" .store=${store} .storeConfigurator=${getLiveStoreConfigurator(/*hydrate=*/false)}></lineup-game-complete>`;
    el = await fixture(template);
  }

  function getStore() {
    return el.store!;
  }

  it('shows no game placeholder when no current game', async () => {
    const store = getStore();
    expect(store.getState().live, 'LiveState should exist').to.be.ok;

    const placeholder = el.shadowRoot!.querySelector('div p.empty-list');
    expect(placeholder, 'Missing empty placeholder element').to.be.ok;

    await expect(el).shadowDom.to.equalSnapshot();
    await expect(el).to.be.accessible();
  });

  it('shows all playing time for complete game', async () => {
    const { game, live } = getGameDetail();
    const shift = buildShiftWithTrackersFromGame(live);
    const gameState = buildGameStateWithCurrentGame(game);
    const liveState = buildLiveStateWithCurrentGame(live,
      { shift });

    await setupElement(buildRootState(gameState, liveState), live.id);
    await el.updateComplete;

    await expect(el).shadowDom.to.equalSnapshot();
    await expect(el).to.be.accessible();
  });
});
