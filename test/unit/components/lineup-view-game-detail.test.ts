import { LineupViewGameDetail } from '@app/components/lineup-view-game-detail';
import '@app/components/lineup-view-game-detail.js';
import { GameDetail, GameStatus } from '@app/models/game';
import { getGameStoreConfigurator } from '@app/slices/game-store';
import { GET_GAME_SUCCESS } from '@app/slices/game-types';
import { resetState, store } from '@app/store';
import { expect, fixture, html } from '@open-wc/testing';
import { buildRoster, getNewGameWithLiveDetail, getStoredPlayer } from '../helpers/test_data';

function getGameDetail(): GameDetail {
  return getNewGameWithLiveDetail(buildRoster([getStoredPlayer()]));
}

describe('lineup-view-game-detail tests', () => {
  let el: LineupViewGameDetail;
  beforeEach(async () => {
    // Resets to the initial store state.
    store.dispatch(resetState());

    const template = html`<lineup-view-game-detail active .store=${store} .storeConfigurator=${getGameStoreConfigurator(false)}></lineup-view-game-detail>`;
    el = await fixture(template);
  });

  it('shows no game placeholder when no current game', async () => {
    expect(store.getState().game).to.be.ok;
    expect(store.getState().game!.game, 'GameState should have game unset').to.not.be.ok;

    const placeholder = el.shadowRoot!.querySelector('section p.empty-list');
    expect(placeholder, 'Missing empty placeholder element').to.be.ok;

    await expect(el).shadowDom.to.equalSnapshot();
  });

  it('shows setup component for new game', async () => {
    const game = getGameDetail();
    game.status = GameStatus.New;

    store.dispatch({ type: GET_GAME_SUCCESS, game });
    await el.updateComplete;

    const setupElement = el.shadowRoot!.querySelector('section lineup-game-setup');
    expect(setupElement, 'Live element should be shown').to.be.ok;

    await expect(el).shadowDom.to.equalSnapshot();
  });

  it('shows live component for started game', async () => {
    const game = getGameDetail();
    game.status = GameStatus.Start;

    store.dispatch({ type: GET_GAME_SUCCESS, game });
    await el.updateComplete;

    const liveElement = el.shadowRoot!.querySelector('section lineup-game-live');
    expect(liveElement, 'Live element should be shown').to.be.ok;

    await expect(el).shadowDom.to.equalSnapshot();
  });

  it('a11y', async () => {
    await expect(el).to.be.accessible();
  });
});
