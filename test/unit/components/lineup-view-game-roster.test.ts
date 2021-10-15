import { LineupRoster } from '@app/components/lineup-roster';
import { LineupViewGameRoster } from '@app/components/lineup-view-game-roster';
import '@app/components/lineup-view-game-roster.js';
import { GameDetail, GameStatus } from '@app/models/game';
import { getGameStoreConfigurator } from '@app/slices/game-store';
import { GET_GAME_SUCCESS } from '@app/slices/game-types';
import { resetState, store } from '@app/store';
import { expect, fixture, html } from '@open-wc/testing';
import { buildRoster, getNewGameWithLiveDetail, getStoredPlayer } from '../helpers/test_data';

function getGameWithRosterPlayers(): GameDetail {
  return getNewGameWithLiveDetail(buildRoster([getStoredPlayer()]));
}

function getGameWithEmptyRoster(): GameDetail {
  return getNewGameWithLiveDetail();
}

describe('lineup-view-game-roster tests', () => {
  let el: LineupViewGameRoster;
  beforeEach(async () => {
    // Resets to the initial store state.
    store.dispatch(resetState());

    const template = html`<lineup-view-game-roster active .store=${store} .storeConfigurator=${getGameStoreConfigurator(false)}></lineup-view-game-roster>`;
    el = await fixture(template);
  });

  it('shows no game placeholder when no current game', async () => {
    expect(store.getState().game).to.be.ok;
    expect(store.getState().game!.game, 'GameState should have game unset').to.not.be.ok;

    const placeholder = el.shadowRoot!.querySelector('section p.empty-list');
    expect(placeholder, 'Missing empty placeholder element').to.be.ok;

    const rosterElement = el.shadowRoot!.querySelector('section lineup-roster');
    expect(rosterElement, 'Roster element should not be shown').to.not.be.ok;

    await expect(el).shadowDom.to.equalSnapshot();
    await expect(el).to.be.accessible();
  });

  it('shows roster placeholder when game roster is empty', async () => {
    const game = getGameWithEmptyRoster();
    game.status = GameStatus.New;

    store.dispatch({ type: GET_GAME_SUCCESS, game });
    await el.updateComplete;

    const placeholder = el.shadowRoot!.querySelector('section div.empty-list');
    expect(placeholder, 'Missing empty placeholder element').to.be.ok;

    const copyButton = placeholder!.querySelector('mwc-button');
    expect(copyButton, 'Missing copy roster button').to.be.ok;

    const rosterElement = el.shadowRoot!.querySelector('section lineup-roster');
    expect(rosterElement, 'Roster element should not be shown').to.not.be.ok;

    await expect(el).shadowDom.to.equalSnapshot();
    await expect(el).to.be.accessible();
  });

  it('shows player list when game roster is not empty', async () => {
    const game = getGameWithRosterPlayers();
    game.status = GameStatus.New;

    store.dispatch({ type: GET_GAME_SUCCESS, game });
    await el.updateComplete;

    const rosterElement = el.shadowRoot!.querySelector('section lineup-roster');
    expect(rosterElement, 'Roster element should be shown').to.be.ok;

    await expect(el).shadowDom.to.equalSnapshot();
    await expect(el).to.be.accessible();
  });

  it('roster adds allowed for new game', async () => {
    const game = getGameWithRosterPlayers();
    game.status = GameStatus.New;

    store.dispatch({ type: GET_GAME_SUCCESS, game });
    await el.updateComplete;

    const rosterElement = el.shadowRoot!.querySelector('section lineup-roster');
    expect(rosterElement, 'Roster element should exist').to.be.ok;

    expect((rosterElement as LineupRoster).addPlayerEnabled).to.be.true;
  });

  it('roster adds not allowed for live game', async () => {
    const game = getGameWithRosterPlayers();
    game.status = GameStatus.Live;

    store.dispatch({ type: GET_GAME_SUCCESS, game });
    await el.updateComplete;

    const rosterElement = el.shadowRoot!.querySelector('section lineup-roster');
    expect(rosterElement, 'Roster element should exist').to.be.ok;

    expect((rosterElement as LineupRoster).addPlayerEnabled).to.be.false;
  });
});
