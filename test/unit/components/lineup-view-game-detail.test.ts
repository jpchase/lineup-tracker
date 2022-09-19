import { LineupViewGameDetail } from '@app/components/lineup-view-game-detail';
import '@app/components/lineup-view-game-detail.js';
import { GameDetail, GameStatus } from '@app/models/game';
import { LiveGame } from '@app/models/live.js';
import { getGameStoreConfigurator } from '@app/slices/game-store';
import { RootState, setupStore } from '@app/store';
import { expect, fixture, html } from '@open-wc/testing';
import { buildGameStateWithCurrentGame } from '../helpers/game-state-setup.js';
import { buildLiveStateWithCurrentGame } from '../helpers/live-state-setup.js';
import { buildRootState } from '../helpers/root-state-setup.js';
import * as testlive from '../helpers/test-live-game-data.js';
import { buildRoster, getNewGameDetail } from '../helpers/test_data';

function getGameDetail(): { game: GameDetail, live: LiveGame } {
  const live = testlive.getLiveGameWithPlayers();
  const game = getNewGameDetail(buildRoster(live.players));
  return { game, live };
}

describe('lineup-view-game-detail tests', () => {
  let el: LineupViewGameDetail;

  async function setupElement(preloadedState?: RootState) {
    const store = setupStore(preloadedState);

    const template = html`<lineup-view-game-detail active .store=${store} .storeConfigurator=${getGameStoreConfigurator(false)}></lineup-view-game-detail>`;
    el = await fixture(template);
  }

  function getStore() {
    return el.store!;
  }

  it('shows no game placeholder when no current game', async () => {
    await setupElement();

    const store = getStore();
    expect(store.getState().game).to.be.ok;
    expect(store.getState().game!.game, 'GameState should have game unset').to.not.be.ok;

    const placeholder = el.shadowRoot!.querySelector('section p.empty-list');
    expect(placeholder, 'Missing empty placeholder element').to.be.ok;

    await expect(el).shadowDom.to.equalSnapshot();
    await expect(el).to.be.accessible();
  });

  it('shows setup component for new game', async () => {
    const { game, live } = getGameDetail();
    game.status = live.status = GameStatus.New;
    const gameState = buildGameStateWithCurrentGame(game);
    const liveState = buildLiveStateWithCurrentGame(live);

    await setupElement(buildRootState(gameState, liveState));
    await el.updateComplete;

    const gameSetupElement = el.shadowRoot!.querySelector('section lineup-game-setup');
    expect(gameSetupElement, 'Live element should be shown').to.be.ok;

    await expect(el).shadowDom.to.equalSnapshot();
    await expect(el).to.be.accessible();
  });

  it('shows live component for started game', async () => {
    const { game, live } = getGameDetail();
    game.status = live.status = GameStatus.Start;
    const gameState = buildGameStateWithCurrentGame(game);
    const liveState = buildLiveStateWithCurrentGame(live);

    await setupElement(buildRootState(gameState, liveState));

    const liveElement = el.shadowRoot!.querySelector('section lineup-game-live');
    expect(liveElement, 'Live element should be shown').to.be.ok;

    await expect(el).shadowDom.to.equalSnapshot();
    await expect(el).to.be.accessible();
  });
});
