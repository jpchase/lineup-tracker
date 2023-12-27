/** @format */

import { LineupViewRoster } from '@app/components/lineup-view-roster';
import '@app/components/lineup-view-roster.js';
import { addMiddleware } from '@app/middleware/dynamic-middlewares.js';
import { Player, Roster } from '@app/models/player.js';
import { Team, Teams } from '@app/models/team.js';
import { currentTeamChanged } from '@app/slices/app/app-slice.js';
import { addPlayer, getRoster, getTeams } from '@app/slices/team/team-slice.js';
import { reader } from '@app/storage/firestore-reader.js';
import { writer } from '@app/storage/firestore-writer.js';
import { RootState, store } from '@app/store.js';
import { Button } from '@material/mwc-button';
import { Fab } from '@material/mwc-fab';
import { expect, fixture, html, nextFrame } from '@open-wc/testing';
import sinon from 'sinon';
import { buildAppStateWithCurrentTeam } from '../helpers/app-state-setup.js';
import { buildTeamStateWithTeams } from '../helpers/team-state-setup.js';
import {
  TEST_USER_ID,
  buildRoster,
  buildTeams,
  getMockAuthState,
  getNewPlayerData,
  getStoredPlayer,
  getStoredTeam,
} from '../helpers/test_data.js';

let actions: string[] = [];
const actionLoggerMiddleware = (/* api */) => (next: any) => (action: any) => {
  actions.push(action);
  return next(action);
};

function buildSignedInState(currentTeam?: Team, teams?: Teams, roster?: Roster): RootState {
  const state = {
    app: buildAppStateWithCurrentTeam(currentTeam!),
    team: buildTeamStateWithTeams(teams!, { roster }),
  } as RootState;
  state.auth = getMockAuthState({ signedIn: true, userId: TEST_USER_ID });
  return state;
}

describe('lineup-view-roster tests', () => {
  let el: LineupViewRoster;
  let dispatchStub: sinon.SinonSpy;
  let readerStub: sinon.SinonStubbedInstance<typeof reader>;

  beforeEach(async () => {
    sinon.restore();
    readerStub = sinon.stub<typeof reader>(reader);
    actions = [];
    addMiddleware(actionLoggerMiddleware);
  });

  afterEach(async () => {
    // removeMiddleware(actionLoggerMiddleware);
  });

  async function setupElement(preloadedState?: RootState) {
    // const store = setupStore(preloadedState, /*hydrate=*/ false);

    // const template = html`<lineup-view-roster
    //   active
    //   .store=${store}
    //   .storeConfigurator=${getTeamStoreConfigurator(/*hydrate=*/ false)}
    // >
    // </lineup-view-roster>`;
    const template = html`<lineup-view-roster active> </lineup-view-roster>`;
    el = await fixture(template);
    // dispatchStub = sinon.spy(el, 'dispatch');
    dispatchStub = sinon.spy(store, 'dispatch');

    const appState = preloadedState?.app;
    const teamState = preloadedState?.team;
    if (!appState && !teamState) {
      return;
    }

    if (appState?.teamId) {
      // Mock the load of the roster, which is triggered by setting the current team.
      mockLoadCollectionWithRoster(appState.teamId, teamState?.roster);

      store.dispatch(currentTeamChanged(appState.teamId, appState.teamName));
    }
    if (teamState) {
      if (teamState.teams) {
        store.dispatch(getTeams.fulfilled({ teams: teamState.teams }, 'unused'));
      }
      store.dispatch(getRoster.fulfilled(teamState.roster ?? {}, 'unused', 'unused'));
    }
  }

  function mockLoadCollectionWithRoster(teamId: string, roster?: Roster) {
    return readerStub.loadCollection
      .withArgs(`teams/${teamId}/roster`, sinon.match.object)
      .resolves(roster ?? {});
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

  it('shows roster placeholder when team roster is empty', async () => {
    const team = getStoredTeam();

    await setupElement(buildSignedInState(team, buildTeams([team])));
    await el.updateComplete;

    // TODO: Figure out how/if should detect empty roster component
    // const placeholder = el.shadowRoot!.querySelector('section div.empty-list');
    // expect(placeholder, 'Missing empty placeholder element').to.be.ok;

    // const rosterElement = el.shadowRoot!.querySelector('section lineup-roster');
    // expect(rosterElement, 'Roster element should not be shown').to.not.be.ok;

    await expect(el).shadowDom.to.equalSnapshot();
    await expect(el).to.be.accessible();
  });

  it('shows player list when team roster is not empty', async () => {
    const team = getStoredTeam();
    const roster = buildRoster([getStoredPlayer()]);

    await setupElement(buildSignedInState(team, buildTeams([team]), roster));
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

    await setupElement(buildSignedInState(team, buildTeams([team])));
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
    expect(actions[actions.length - 1]).to.deep.include(addPlayer(expectedPlayer));
  });
});
