import { GET_GAME_SUCCESS } from '@app/actions/game-types';
import { LineupViewGameDetail } from '@app/components/lineup-view-game-detail';
import '@app/components/lineup-view-game-detail.js';
import { GameDetail, GameStatus } from '@app/models/game';
import { resetState, store } from '@app/store';
import { expect, fixture, html } from '@open-wc/testing';
import { buildRoster, getNewGameWithLiveDetail, getStoredPlayer } from '../helpers/test_data';
import { getGameStoreConfigurator } from '@app/slices/game-store';

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

  it('shows starter player sections for new game', async () => {
    const game = getGameDetail();
    expect(game.status).to.equal(GameStatus.New);
    store.dispatch({ type: GET_GAME_SUCCESS, game });
    await el.updateComplete;

    const starters = getPlayerSection('on');
    const onHeader = starters.querySelector('h5');
    expect(onHeader, 'Missing starters header').to.be.ok;
    expect(onHeader!.textContent!.trim()).to.equal('Starters');

    const offPlayers = getPlayerSection('off');
    const offHeader = offPlayers.querySelector('h5');
    expect(offHeader, 'Missing starters header').to.be.ok;
    expect(offHeader!.textContent!.trim()).to.equal('Subs');

    const nextPlayers = getPlayerSection('next');
    expect(nextPlayers.hidden, 'Section for next should be hidden').to.be.true;

    const outPlayers = getPlayerSection('out');
    expect(outPlayers.hidden, 'Section for out should be hidden').to.be.true;
  });

  it('shows all player sections for started game', async () => {
    const game = getGameDetail();
    game.status = GameStatus.Start;

    store.dispatch({ type: GET_GAME_SUCCESS, game });
    await el.updateComplete;

    const starters = getPlayerSection('on');
    const onHeader = starters.querySelector('h5');
    expect(onHeader, 'Missing starters header').to.be.ok;
    expect(onHeader!.textContent!.trim()).to.equal('Starters');

    const nextPlayers = getPlayerSection('next');
    expect(nextPlayers.hidden, 'Section for next should be shown').to.be.false;

    const offPlayers = getPlayerSection('off');
    const offHeader = offPlayers.querySelector('h5');
    expect(offHeader, 'Missing starters header').to.be.ok;
    expect(offHeader!.textContent!.trim()).to.equal('Subs');

    const outPlayers = getPlayerSection('out');
    expect(outPlayers.hidden, 'Section for out should be shown').to.be.false;
  });

  it('a11y', async () => {
    await expect(el).to.be.accessible();
  });
});
