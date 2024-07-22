/** @format */

import { LineupViewGameDetail } from '@app/components/lineup-view-game-detail.js';
import '@app/components/lineup-view-game-detail.js';
import { GameDetail, GameStatus } from '@app/models/game.js';
import { LiveGame } from '@app/models/live.js';
import { RootState, setupStore } from '@app/store.js';
import { expect, fixture, html } from '@open-wc/testing';
import { ifDefined } from 'lit/directives/if-defined.js';
import {
  buildGameStateWithCurrentGame,
  buildInitialGameState,
} from '../helpers/game-state-setup.js';
import {
  buildInitialLiveState,
  buildLiveStateWithCurrentGame,
} from '../helpers/live-state-setup.js';
import { buildRootState } from '../helpers/root-state-setup.js';
import * as testlive from '../helpers/test-live-game-data.js';
import {
  buildRoster,
  getMockAuthState,
  getNewGameDetail,
  TEST_USER_ID,
} from '../helpers/test_data.js';

function getGameDetail(): { game: GameDetail; live: LiveGame } {
  const live = testlive.getLiveGameWithPlayers();
  const game = getNewGameDetail(buildRoster(live.players));
  return { game, live };
}

function buildSignedInState(game?: GameDetail, live?: LiveGame): RootState {
  const gameState = game ? buildGameStateWithCurrentGame(game) : buildInitialGameState();
  const liveState = live ? buildLiveStateWithCurrentGame(live) : buildInitialLiveState();
  const state = buildRootState(gameState, liveState);
  state.auth = getMockAuthState({ signedIn: true, userId: TEST_USER_ID });
  return state;
}

describe('lineup-view-game-detail tests', () => {
  let el: LineupViewGameDetail;

  async function setupElement(preloadedState?: RootState, gameId?: string) {
    const store = setupStore(preloadedState, /*hydrate=*/ false);

    const template = html`<lineup-view-game-detail
      gameId="${ifDefined(gameId)}"
      active
      .store=${store}
    >
    </lineup-view-game-detail>`;
    el = await fixture(template);
  }

  it('shows signin placeholder when not signed in', async () => {
    const { game, live } = getGameDetail();
    const state = buildRootState(
      buildGameStateWithCurrentGame(game),
      buildLiveStateWithCurrentGame(live),
    );
    state.auth = getMockAuthState({ signedIn: false });

    await setupElement(state, game.id);

    const placeholder = el.shadowRoot!.querySelector('section p.unauthorized');
    expect(placeholder, 'Missing unauthorized placeholder element').to.be.ok;

    await expect(el).shadowDom.to.equalSnapshot();
    await expect(el).to.be.accessible();
  });

  it('shows no game placeholder when no current game', async () => {
    await setupElement(buildSignedInState());

    const placeholder = el.shadowRoot!.querySelector('section p.empty-list');
    expect(placeholder, 'Missing empty placeholder element').to.be.ok;

    await expect(el).shadowDom.to.equalSnapshot();
    await expect(el).to.be.accessible();
  });

  it('shows setup component for new game', async () => {
    const { game, live } = getGameDetail();
    game.status = live.status = GameStatus.New;

    await setupElement(buildSignedInState(game, live), game.id);
    await el.updateComplete;

    const gameSetupElement = el.shadowRoot!.querySelector('section lineup-game-setup');
    expect(gameSetupElement, 'Live element should be shown').to.be.ok;

    await expect(el).shadowDom.to.equalSnapshot();
    await expect(el).to.be.accessible();
  });

  it('shows live component for started game', async () => {
    const { game, live } = getGameDetail();
    game.status = live.status = GameStatus.Start;

    await setupElement(buildSignedInState(game, live), game.id);

    const liveElement = el.shadowRoot!.querySelector('section lineup-game-live');
    expect(liveElement, 'Live element should be shown').to.be.ok;

    await expect(el).shadowDom.to.equalSnapshot();
    await expect(el).to.be.accessible();
  });

  it('shows complete component for done game', async () => {
    const { game, live } = getGameDetail();
    game.status = live.status = GameStatus.Done;

    await setupElement(buildSignedInState(game, live), game.id);

    const completeElement = el.shadowRoot!.querySelector('section lineup-game-complete');
    expect(completeElement, 'Complete element should be shown').to.be.ok;

    await expect(el).shadowDom.to.equalSnapshot();
    await expect(el).to.be.accessible();
  });
});
