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

  function getPlayerSection(mode: string): HTMLDivElement {
    const section = el.shadowRoot!.querySelector(`#live-${mode}`);
    expect(section, `Missing section for mode ${mode}`).to.be.ok;

    return section as HTMLDivElement;
  }

  it('shows no game placeholder when no current game', () => {
    expect(store.getState().game).to.be.ok;
    expect(store.getState().game!.game, 'GameState should have game unset').to.not.be.ok;

    const placeholder = el.shadowRoot!.querySelector('section p.empty-list');
    expect(placeholder, 'Missing empty placeholder element').to.be.ok;
  });

  it('shows all player sections for started game', async () => {
    const game = getGameDetail();
    game.status = GameStatus.Start;

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
  });

  it('a11y', async () => {
    await expect(el).to.be.accessible();
  });
});
