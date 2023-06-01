/** @format */

import { LineupRoster } from '@app/components/lineup-roster.js';
import '@app/components/lineup-view-game-roster.js';
import { LineupViewGameRoster } from '@app/components/lineup-view-game-roster.js';
import { GameDetail, GameStatus } from '@app/models/game.js';
import { getGameStoreConfigurator } from '@app/slices/game-store.js';
import { RootState, setupStore } from '@app/store.js';
import { expect, fixture, html } from '@open-wc/testing';
import { ifDefined } from 'lit/directives/if-defined.js';
import {
  buildGameStateWithCurrentGame,
  buildInitialGameState,
} from '../helpers/game-state-setup.js';
import { buildRootState } from '../helpers/root-state-setup.js';
import {
  buildRoster,
  getMockAuthState,
  getNewGameDetail,
  getStoredPlayer,
  TEST_USER_ID,
} from '../helpers/test_data.js';

function getGameWithRosterPlayers(): GameDetail {
  return getNewGameDetail(buildRoster([getStoredPlayer()]));
}

function getGameWithEmptyRoster(): GameDetail {
  return getNewGameDetail();
}

function buildSignedInState(game?: GameDetail): RootState {
  const gameState = game ? buildGameStateWithCurrentGame(game) : buildInitialGameState();
  const state = buildRootState(gameState);
  state.auth = getMockAuthState({ signedIn: true, userId: TEST_USER_ID });
  return state;
}

describe('lineup-view-game-roster tests', () => {
  let el: LineupViewGameRoster;

  async function setupElement(preloadedState?: RootState, gameId?: string) {
    const store = setupStore(preloadedState, /*hydrate=*/ false);

    const template = html`<lineup-view-game-roster
      gameId="${ifDefined(gameId)}"
      active
      .store=${store}
      .storeConfigurator=${getGameStoreConfigurator(/*hydrate=*/ false)}
    >
    </lineup-view-game-roster>`;
    el = await fixture(template);
  }

  it('shows signin placeholder when not signed in', async () => {
    const game = getGameWithEmptyRoster();
    const state = buildRootState(buildGameStateWithCurrentGame(game));
    state.auth = getMockAuthState({ signedIn: false });
    await setupElement(state, game.id);

    const placeholder = el.shadowRoot!.querySelector('section p.unauthorized');
    expect(placeholder, 'Missing unauthorized placeholder element').to.be.ok;

    const rosterElement = el.shadowRoot!.querySelector('section lineup-roster');
    expect(rosterElement, 'Roster element should not be shown').to.not.be.ok;

    await expect(el).shadowDom.to.equalSnapshot();
    await expect(el).to.be.accessible();
  });

  it('shows no game placeholder when no current game', async () => {
    await setupElement(buildSignedInState());

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

    await setupElement(buildSignedInState(game), game.id);
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

    await setupElement(buildSignedInState(game), game.id);
    await el.updateComplete;

    const rosterElement = el.shadowRoot!.querySelector('section lineup-roster');
    expect(rosterElement, 'Roster element should be shown').to.be.ok;

    await expect(el).shadowDom.to.equalSnapshot();
    await expect(el).to.be.accessible({
      // Disable color-contrast as colors depend on global styles, which are
      // not available in standalone component.
      // Disable list until addressed by mwc-list component.
      ignoredRules: ['color-contrast', 'list'],
    });
  });

  it('clears data when game id changes', async () => {
    const game = getGameWithRosterPlayers();
    game.status = GameStatus.New;

    await setupElement(buildSignedInState(game), game.id);
    await el.updateComplete;

    let rosterElement = el.shadowRoot!.querySelector('section lineup-roster');
    expect(rosterElement, 'Roster element should be shown').to.be.ok;

    el.gameId = undefined;
    await el.updateComplete;

    rosterElement = el.shadowRoot!.querySelector('section lineup-roster');
    expect(rosterElement, 'Roster element should no longer be shown').to.not.be.ok;
  });

  it('roster adds allowed for new game', async () => {
    const game = getGameWithRosterPlayers();
    game.status = GameStatus.New;

    await setupElement(buildSignedInState(game), game.id);
    await el.updateComplete;

    const rosterElement = el.shadowRoot!.querySelector('section lineup-roster');
    expect(rosterElement, 'Roster element should exist').to.be.ok;

    expect((rosterElement as LineupRoster).addPlayerEnabled).to.be.true;
  });

  it('roster adds not allowed for live game', async () => {
    const game = getGameWithRosterPlayers();
    game.status = GameStatus.Live;

    await setupElement(buildSignedInState(game), game.id);
    await el.updateComplete;

    const rosterElement = el.shadowRoot!.querySelector('section lineup-roster');
    expect(rosterElement, 'Roster element should exist').to.be.ok;

    expect((rosterElement as LineupRoster).addPlayerEnabled).to.be.false;
  });
});
