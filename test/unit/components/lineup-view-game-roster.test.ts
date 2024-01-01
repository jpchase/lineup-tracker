/** @format */

import { LineupRoster } from '@app/components/lineup-roster.js';
import '@app/components/lineup-view-game-roster.js';
import { LineupViewGameRoster } from '@app/components/lineup-view-game-roster.js';
import { addMiddleware } from '@app/middleware/dynamic-middlewares.js';
import { GameDetail, GameStatus } from '@app/models/game.js';
import { Player } from '@app/models/player.js';
import { actions as gameActions } from '@app/slices/game/game-slice.js';
import { writer } from '@app/storage/firestore-writer.js';
import { RootState, setupStore } from '@app/store.js';
import { Button } from '@material/mwc-button';
import { Fab } from '@material/mwc-fab';
import { expect, fixture, html, nextFrame } from '@open-wc/testing';
import { ifDefined } from 'lit/directives/if-defined.js';
import sinon from 'sinon';
import {
  buildGameStateWithCurrentGame,
  buildInitialGameState,
} from '../helpers/game-state-setup.js';
import { buildRootState } from '../helpers/root-state-setup.js';
import {
  TEST_USER_ID,
  buildRoster,
  getMockAuthState,
  getNewGameDetail,
  getNewPlayerData,
  getStoredPlayer,
} from '../helpers/test_data.js';

const { gamePlayerAdded } = gameActions;

let actions: string[] = [];
const actionLoggerMiddleware = (/* api */) => (next: any) => (action: any) => {
  actions.push(action);
  return next(action);
};

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
  let dispatchStub: sinon.SinonSpy;

  beforeEach(async () => {
    sinon.restore();
    // readerStub = sinon.stub<typeof reader>(reader);
    actions = [];
    addMiddleware(actionLoggerMiddleware);
  });

  afterEach(async () => {
    // removeMiddleware(actionLoggerMiddleware);
  });

  async function setupElement(preloadedState?: RootState, gameId?: string) {
    const store = setupStore(preloadedState, /*hydrate=*/ false);

    const template = html`<lineup-view-game-roster
      gameId="${ifDefined(gameId)}"
      active
      .store=${store}
    >
    </lineup-view-game-roster>`;
    el = await fixture(template);
    dispatchStub = sinon.spy(el, 'dispatch');
  }

  function getRosterElement() {
    const element = el.shadowRoot!.querySelector('section lineup-roster');
    expect(element, 'Roster element should be shown').to.be.ok;
    return element as Element;
  }

  function getAddPlayerButton(rosterElement: Element) {
    return rosterElement.shadowRoot!.querySelector('mwc-fab') as Fab;
  }

  function getPlayerModifyDialog(rosterElement: Element) {
    const modifyElement = rosterElement.shadowRoot!.querySelector('lineup-roster-modify');
    expect(modifyElement, 'Missing roster modify element').to.exist;
    return modifyElement!.shadowRoot!.querySelector('#modify-dialog') as Element;
  }

  function getPlayerInputField(dialog: Element, fieldId: string): HTMLInputElement {
    const field = dialog.querySelector(`#${fieldId} > input`);
    expect(field, `Missing field: ${fieldId}`).to.be.ok;
    return field as HTMLInputElement;
  }

  function getPlayerSaveButton(dialog: Element) {
    const button = dialog.querySelector('mwc-button.save');
    return button as Button;
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

  it('creates new player in game roster when saved', async () => {
    // Mock the call to add the player in storage.
    const writerStub = sinon.stub<typeof writer>(writer);
    writerStub.updateDocument.returns();

    const game = getGameWithRosterPlayers();
    game.status = GameStatus.New;

    await setupElement(buildSignedInState(game), game.id);
    await el.updateComplete;

    // Click the "add player" button, then fill in fields in the resulting dialog, and save.
    const rosterElement = getRosterElement();

    const addPlayerButton = getAddPlayerButton(rosterElement);
    addPlayerButton.click();

    const playerDialog = getPlayerModifyDialog(rosterElement);

    const playerData = getNewPlayerData();
    const nameField = getPlayerInputField(playerDialog, 'nameField');
    nameField.value = playerData.name;

    const uniformField = getPlayerInputField(playerDialog, 'uniformNumberField');
    uniformField.valueAsNumber = playerData.uniformNumber;

    const saveButton = getPlayerSaveButton(playerDialog);
    saveButton.click();

    // Allow promises to resolve, in the persistence of the player.
    await nextFrame();

    // Verifies that the add player action was dispatched.
    expect(dispatchStub).to.have.been.called;

    const expectedPlayer = {
      id: '',
      name: playerData.name,
      uniformNumber: playerData.uniformNumber,
      status: playerData.status,
      positions: [],
    } as Player;
    expect(actions).to.have.lengthOf.at.least(1);
    expect(actions[actions.length - 1]).to.deep.include(gamePlayerAdded(game.id, expectedPlayer));
  });
});
