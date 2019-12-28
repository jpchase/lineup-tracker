import { LineupGameLive } from '@app/components/lineup-game-live';
import '@app/components/lineup-game-live.js';
import { addMiddleware, removeMiddleware } from '@app/middleware/dynamic-middlewares';
import { GameDetail, GameStatus } from '@app/models/game';
import { GET_GAME_SUCCESS } from '@app/slices/game-types';
import { getLiveStoreConfigurator } from '@app/slices/live-store';
import { resetState, store } from '@app/store';
import { expect, fixture, html } from '@open-wc/testing';
// import * as sinon from 'sinon';
import { buildRoster, getStoredPlayer, getNewGameDetail } from '../helpers/test_data';
// import { getLiveGame } from '../helpers/test-live-game-data';

let actions: string[] = [];
const actionLoggerMiddleware = (/* api */) => (next: any) => (action: any) => {
  actions.push(action);
  return next(action);
}

// function getGame(): LiveGame {
//   return getLiveGame([getStoredPlayer()]);
// }

function getGameDetail(): GameDetail {
  const game = getNewGameDetail(buildRoster([getStoredPlayer()]));
  game.status = GameStatus.Start;
  return game;
}

describe('lineup-game-live tests', () => {
  let el: LineupGameLive;
  beforeEach(async () => {
    // Resets to the initial store state.
    store.dispatch(resetState());

    // sinon.restore();

    actions = [];
    addMiddleware(actionLoggerMiddleware);

    const template = html`<lineup-game-live .store=${store} .storeConfigurator=${getLiveStoreConfigurator(false)}></lineup-game-live>`;
    el = await fixture(template);
  });

  afterEach(async () => {
    removeMiddleware(actionLoggerMiddleware);
  });

  function getPlayerSection(mode: string): HTMLDivElement {
    const section = el.shadowRoot!.querySelector(`#live-${mode}`);
    expect(section, `Missing section for mode ${mode}`).to.be.ok;

    return section as HTMLDivElement;
  }

  it('shows no game placeholder when no current game', () => {
    expect(store.getState().live, 'LiveState should exist').to.be.ok;
    expect(store.getState().live!.liveGame, 'LiveState should have game unset').to.not.be.ok;

    const placeholder = el.shadowRoot!.querySelector('div p.empty-list');
    expect(placeholder, 'Missing empty placeholder element').to.be.ok;

    expect(el).shadowDom.to.equalSnapshot();
  });

  it('shows all player sections for started game', async () => {
    const game = getGameDetail();

    store.dispatch({ type: GET_GAME_SUCCESS, game });
    await el.updateComplete;

    const onPlayers = getPlayerSection('on');
    expect(onPlayers.hidden, 'Section for on should be shown').to.be.false;

    const nextPlayers = getPlayerSection('next');
    expect(nextPlayers.hidden, 'Section for next should be shown').to.be.false;

    const offPlayers = getPlayerSection('off');
    expect(offPlayers.hidden, 'Section for off should be shown').to.be.false;

    const outPlayers = getPlayerSection('out');
    expect(outPlayers.hidden, 'Section for out should be shown').to.be.false;

    expect(el).shadowDom.to.equalSnapshot();
  });

  it('a11y', async () => {
    await expect(el).to.be.accessible();
  });
});
