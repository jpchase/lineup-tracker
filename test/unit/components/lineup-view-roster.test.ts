/** @format */

import { RootState, setupStore } from '@app/app/store.js';
import '@app/components/lineup-view-roster.js';
import { LineupViewRoster } from '@app/components/lineup-view-roster.js';
import { Player, Roster } from '@app/models/player.js';
import { Team } from '@app/models/team.js';
import { actions as teamActions } from '@app/slices/team/team-slice.js';
import { writer } from '@app/storage/firestore-writer.js';
import { Button } from '@material/mwc-button';
import { aTimeout, expect, fixture, html, nextFrame } from '@open-wc/testing';
import sinon from 'sinon';
import { ActionLogger } from '../helpers/action-logger.js';
import { buildAppStateWithCurrentTeam } from '../helpers/app-state-setup.js';
import { buildRootState } from '../helpers/root-state-setup.js';
import { buildTeamStateWithTeams } from '../helpers/team-state-setup.js';
import {
  TEST_USER_ID,
  getMockAuthState,
  getNewPlayerData,
  getStoredTeam,
} from '../helpers/test_data.js';

const { addPlayer } = teamActions;

function buildSignedInState(currentTeam?: Team, roster?: Roster): RootState {
  const state = {
    app: buildAppStateWithCurrentTeam(currentTeam!),
    team: buildTeamStateWithTeams(undefined, { roster }),
  } as RootState;
  state.auth = getMockAuthState({ signedIn: true, userId: TEST_USER_ID });
  return state;
}

describe('lineup-view-roster tests', () => {
  let el: LineupViewRoster;
  let dispatchStub: sinon.SinonSpy;
  let actionLogger: ActionLogger;

  beforeEach(async () => {
    actionLogger = new ActionLogger();
    actionLogger.setup();
  });

  afterEach(async () => {
    sinon.restore();
  });

  async function setupElement(preloadedState?: RootState) {
    const store = setupStore(preloadedState, /*hydrate=*/ false);

    const template = html`<lineup-view-roster active .store=${store}></lineup-view-roster>`;
    el = await fixture(template);
    dispatchStub = sinon.spy(el, 'dispatch');
  }

  function getRosterElement() {
    const element = el.shadowRoot!.querySelector('section lineup-roster');
    expect(element, 'Roster element should be shown').to.be.ok;
    return element!;
  }

  function getAddPlayerButton(rosterElement: Element) {
    return rosterElement.shadowRoot!.querySelector('mwc-fab')!;
  }

  function getPlayerModifyDialog(rosterElement: Element) {
    const modifyElement = rosterElement.shadowRoot!.querySelector('lineup-roster-modify');
    expect(modifyElement, 'Missing roster modify element').to.exist;
    return modifyElement!.shadowRoot!.querySelector('#modify-dialog')!;
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
    const state = buildRootState();
    state.auth = getMockAuthState({ signedIn: false });

    await setupElement(state);

    const placeholder = el.shadowRoot!.querySelector<HTMLElement>('section p.unauthorized')!;
    expect(placeholder, 'Missing unauthorized placeholder element').to.be.ok;
    expect(placeholder.innerText.trim()).to.equal('Sign in to view team roster.');

    await expect(el).shadowDom.to.equalSnapshot();
    await expect(el).to.be.accessible();
  });

  it('shows roster component when signed in', async () => {
    const team = getStoredTeam();

    await setupElement(buildSignedInState(team, /*roster=*/ {}));
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

  it('creates new player in team roster when saved', async () => {
    // Mock the call to add the player in storage.
    const writerStub = sinon.stub<typeof writer>(writer);
    writerStub.updateDocument.returns();

    const team = getStoredTeam();

    await setupElement(buildSignedInState(team, /*roster=*/ {}));
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
    await Promise.race([nextFrame(), aTimeout(10)]);

    // Verifies that the add player action was dispatched.
    expect(dispatchStub).to.have.been.called;

    const expectedPlayer = {
      id: '',
      name: playerData.name,
      uniformNumber: playerData.uniformNumber,
      status: playerData.status,
      positions: [],
    } as Player;
    expect(actionLogger.lastAction()).to.deep.include(addPlayer(expectedPlayer));
  });
});
