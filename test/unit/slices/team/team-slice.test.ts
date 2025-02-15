/** @format */

import { Player } from '@app/models/player.js';
import { Team, TeamData } from '@app/models/team.js';
import {
  TeamState,
  actions,
  addNewPlayer,
  addNewTeam,
  getRoster,
  getTeams,
  savePlayer,
  saveTeam,
  selectTeamRoster,
  selectTeamRosterLoaded,
  selectTeamsLoaded,
  teamSlice,
} from '@app/slices/team/team-slice.js';
import { reader } from '@app/storage/firestore-reader.js';
import { writer } from '@app/storage/firestore-writer.js';
import { expect } from '@open-wc/testing';
import sinon from 'sinon';
import { buildRootState } from '../../helpers/root-state-setup.js';
import { buildInitialTeamState, buildTeamStateWithTeams } from '../../helpers/team-state-setup.js';
import {
  MockAuthStateOptions,
  TEST_USER_ID,
  buildRoster,
  buildTeams,
  getMockAuthState,
  getNewPlayer,
  getNewPlayerData,
  getPublicTeam,
  getStoredPlayer,
  getStoredTeam,
} from '../../helpers/test_data.js';

const KEY_TEAMS = 'teams';
const KEY_ROSTER = 'roster';

const { addPlayer, addTeam } = actions;
const team = teamSlice.reducer;

export function getNewTeamData() {
  return { name: 'New team 1' };
}

// New team created by the UI does not have an ID until added to storage.
function getNewTeam(): TeamData {
  return {
    ...getNewTeamData(),
  };
}
const newTeamSaved: Team = {
  ...getNewTeam(),
  id: 'somerandomid',
};

function mockGetState(
  teams: Team[],
  currentTeam?: Team,
  options?: MockAuthStateOptions,
  players?: Player[],
) {
  return sinon.fake(() => {
    const teamData = buildTeams(teams);
    const rosterData = buildRoster(players);

    return {
      app: {
        teamId: currentTeam ? currentTeam.id : undefined,
        teamName: currentTeam ? currentTeam.name : undefined,
      },
      auth: getMockAuthState(options),
      team: {
        teams: teamData,
        roster: rosterData,
      },
    };
  });
}

describe('Team slice', () => {
  let readerStub: sinon.SinonStubbedInstance<typeof reader>;
  let writerStub: sinon.SinonStubbedInstance<typeof writer>;

  beforeEach(() => {
    sinon.restore();

    readerStub = sinon.stub<typeof reader>(reader);
    writerStub = sinon.stub<typeof writer>(writer);
  });

  function mockLoadCollectionWithStoredTeams() {
    const userFilter = { field: 'owner_uid', operator: '==', value: TEST_USER_ID };
    return readerStub.loadCollection
      .withArgs(KEY_TEAMS, sinon.match.object, userFilter)
      .resolves(buildTeams([getStoredTeam()]));
  }

  function mockLoadCollectionWithPublicTeams() {
    const isPublicFilter = { field: 'public', operator: '==', value: true };
    return readerStub.loadCollection
      .withArgs(KEY_TEAMS, sinon.match.object, isPublicFilter)
      .resolves(buildTeams([getPublicTeam()]));
  }

  describe('getTeams', () => {
    let currentState: TeamState;

    it('should set loading flag for pending', () => {
      currentState = buildInitialTeamState();

      const newState = team(currentState, {
        type: getTeams.pending.type,
      });

      const newRootState = buildRootState();
      newRootState.team = newState;
      expect(selectTeamsLoaded(newRootState), 'Teams loaded selector').to.be.false;

      expect(newState).to.include({
        teamsLoading: true,
        teamsLoaded: false,
      });

      expect(newState).not.to.equal(currentState);
    });

    it('should dispatch an action with owned teams returned from storage', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([], undefined, { signedIn: true, userId: TEST_USER_ID });
      const loadCollectionStub = mockLoadCollectionWithStoredTeams();

      await getTeams()(dispatchMock, getStateMock, undefined);

      // Check that first dispatch was the request action
      expect(dispatchMock.firstCall).to.have.been.calledWith(
        sinon.match({
          type: getTeams.pending.type,
        }),
      );

      expect(dispatchMock.lastCall).to.have.been.calledWith(
        sinon.match({
          type: getTeams.fulfilled.type,
          payload: {
            teams: buildTeams([getStoredTeam()]),
          },
        }),
      );

      expect(loadCollectionStub, 'loadCollection').to.have.callCount(1);
    });

    it('should set the teams state to the retrieved list', () => {
      currentState = buildInitialTeamState();
      const expectedTeams = buildTeams([getStoredTeam()]);

      const newState = team(
        currentState,
        getTeams.fulfilled(
          {
            teams: expectedTeams,
          },
          '',
        ),
      );

      const newRootState = buildRootState();
      newRootState.team = newState;
      expect(selectTeamsLoaded(newRootState), 'Teams loaded selector').to.be.true;

      expect(newState).to.deep.include({
        teams: expectedTeams,
        teamsLoading: false,
        teamsLoaded: true,
      });

      expect(newState.teams).to.not.equal(currentState.teams);
    });

    it('should dispatch an action with public teams when not signed in', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([], undefined, { signedIn: false });
      mockLoadCollectionWithPublicTeams();

      await getTeams()(dispatchMock, getStateMock, undefined);

      expect(dispatchMock).to.have.been.calledWith(
        sinon.match({
          type: getTeams.fulfilled.type,
          payload: {
            teams: buildTeams([getPublicTeam()]),
          },
        }),
      );
    });

    it('should dispatch rejected action when storage access fails', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([], undefined, { signedIn: true, userId: TEST_USER_ID });
      readerStub.loadCollection.onFirstCall().throws(() => {
        return new Error('Storage failed with some error');
      });

      await getTeams()(dispatchMock, getStateMock, undefined);

      expect(dispatchMock).to.have.been.calledWith(
        sinon.match({
          type: getTeams.rejected.type,
          error: { message: 'Storage failed with some error' },
        }),
      );
    });
  }); // describe('getTeams')

  describe('addNewTeam', () => {
    it('should do nothing if new team is missing', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = sinon.stub();

      await addNewTeam(undefined as unknown as Team)(dispatchMock, getStateMock, undefined);

      expect(getStateMock).to.not.have.been.called;

      expect(dispatchMock).to.not.have.been.called;
    });

    it('should dispatch an action to add a new team that is unique', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([{ id: 'EX', name: 'Existing team' }]);

      await addNewTeam(getNewTeam() as Team)(dispatchMock, getStateMock, undefined);

      expect(getStateMock).to.have.been.called;

      expect(dispatchMock).to.have.been.calledWith(sinon.match.instanceOf(Function));
    });

    it('should do nothing with a new team that is not unique', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([newTeamSaved]);

      await addNewTeam(getNewTeam() as Team)(dispatchMock, getStateMock, undefined);

      expect(getStateMock).to.have.been.called;

      expect(dispatchMock).to.not.have.been.called;
    });
  }); // describe('addNewTeam')

  describe('saveTeam', () => {
    it('should save to storage and dispatch an action to add team', async () => {
      const expectedId = 'randomGeneratedID45234';
      const expectedSavedTeam: Team = {
        ...getNewTeamData(),
        id: expectedId,
      };

      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([], undefined, { signedIn: true, userId: TEST_USER_ID });
      const saveNewDocumentStub = writerStub.saveNewDocument.callsFake((model) => {
        model.id = expectedId;
        return Promise.resolve();
      });

      const inputTeam = getNewTeam();
      await saveTeam(inputTeam as Team)(dispatchMock, getStateMock, undefined);

      // Checks that the new team was saved to the database.
      expect(saveNewDocumentStub).calledOnceWith(
        inputTeam,
        KEY_TEAMS,
        undefined,
        sinon.match.object,
        { addUserId: true },
      );
      expect(inputTeam, 'Input team should have properties set by saving').to.deep.equal(
        expectedSavedTeam,
      );

      expect(dispatchMock).to.have.been.calledWith({
        type: addTeam.type,
        payload: expectedSavedTeam,
      });
    });

    it('should not dispatch an action when storage access fails', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = sinon.stub();
      writerStub.saveNewDocument.onFirstCall().throws(() => {
        return new Error('Storage failed with some error');
      });

      let rejected = false;
      try {
        await saveTeam(getNewTeam() as Team)(dispatchMock, getStateMock, undefined);
      } catch {
        rejected = true;
      }
      expect(rejected, 'saveTeam should reject promise').to.be.true;

      expect(dispatchMock).to.not.have.been.called;
    });
  }); // describe('saveTeam')

  describe('addTeam', () => {
    const newTeam: Team = {
      id: 'nt1',
      name: 'New team 1',
    };
    let currentState: TeamState;

    it('should populate an empty teams list', () => {
      currentState = buildInitialTeamState();
      const expectedTeams = buildTeams([newTeam]);

      const newState = team(currentState, addTeam(newTeam));

      expect(newState).to.deep.include({
        teams: expectedTeams,
      });

      expect(newState).to.not.equal(currentState);
      expect(newState.teams).to.not.equal(currentState.teams);
    });

    it('should add to existing teams list', () => {
      currentState = buildTeamStateWithTeams(buildTeams([getStoredTeam()]));

      const expectedTeams = buildTeams([getStoredTeam(), newTeam]);

      const newState = team(currentState, addTeam(newTeam));

      expect(newState).to.deep.include({
        teams: expectedTeams,
      });

      expect(newState).to.not.equal(currentState);
      expect(newState.teams).to.not.equal(currentState.teams);
    });
  }); // describe('addTeam')

  describe('getRoster', () => {
    let currentState: TeamState;

    it('should do nothing if team id is missing', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = sinon.stub();

      await getRoster('')(dispatchMock, getStateMock, undefined);

      expect(readerStub.loadCollection).to.not.have.been.called;

      expect(dispatchMock).to.not.have.been.called;
    });

    it('should set loading flag for pending', () => {
      currentState = buildInitialTeamState();
      const teamId = getStoredTeam().id;

      const newState = team(currentState, {
        type: getRoster.pending.type,
        meta: {
          teamId,
        },
      });

      const newRootState = buildRootState();
      newRootState.team = newState;
      expect(selectTeamRosterLoaded(newRootState), 'Roster loaded selector').to.be.false;

      expect(newState).to.include({
        rosterLoading: true,
        rosterLoaded: false,
      });

      expect(newState).not.to.equal(currentState);
    });

    it('should dispatch an action with the roster returned from storage', async () => {
      const teamId = getStoredTeam().id;
      const dispatchMock = sinon.stub();
      const getStateMock = sinon.stub();

      readerStub.loadCollection.resolves(buildRoster([getStoredPlayer()]));

      await getRoster(teamId)(dispatchMock, getStateMock, undefined);

      // Check that first dispatch was the request action
      expect(dispatchMock.firstCall).to.have.been.calledWith(
        sinon.match({
          type: getRoster.pending.type,
          meta: {
            teamId,
          },
        }),
      );

      const rosterData = buildRoster([getStoredPlayer()]);
      expect(dispatchMock.lastCall).to.have.been.calledWith(
        sinon.match({
          type: getRoster.fulfilled.type,
          payload: rosterData,
        }),
      );
    });

    it('should set the roster to the retrieved list', () => {
      currentState = buildInitialTeamState();
      const expectedRoster = buildRoster([getStoredPlayer()]);

      const newState = team(currentState, {
        type: getRoster.fulfilled.type,
        payload: expectedRoster,
      });

      const newRootState = buildRootState();
      newRootState.team = newState;
      expect(selectTeamRosterLoaded(newRootState), 'Roster loaded selector').to.be.true;
      expect(selectTeamRoster(newRootState), 'Roster selector').to.deep.equal(expectedRoster);

      expect(newState).to.deep.include({
        roster: expectedRoster,
        rosterLoaded: true,
        rosterLoading: false,
      });

      expect(newState).to.not.equal(currentState);
      expect(newState.roster).to.not.equal(currentState.roster);
    });

    it('should dispatch a rejected action when storage access fails', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([], undefined, { signedIn: true, userId: TEST_USER_ID });

      readerStub.loadCollection.onFirstCall().throws(() => {
        return new Error('Storage failed with some error');
      });

      await getRoster(getStoredTeam().id)(dispatchMock, getStateMock, undefined);

      expect(dispatchMock).to.have.been.calledWith(
        sinon.match({
          type: getRoster.rejected.type,
          error: { message: 'Storage failed with some error' },
        }),
      );
    });
  }); // describe('getRoster')

  describe('addNewPlayer', () => {
    it('should do nothing if new player is missing', () => {
      const dispatchMock = sinon.stub();
      const getStateMock = sinon.stub();

      addNewPlayer(undefined as unknown as Player)(dispatchMock, getStateMock, undefined);

      expect(getStateMock).to.not.have.been.called;

      expect(dispatchMock).to.not.have.been.called;
    });

    it('should dispatch an action to add a new player that is unique', () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([], undefined, undefined, [getStoredPlayer()]);

      addNewPlayer(getNewPlayer())(dispatchMock, getStateMock, undefined);

      expect(getStateMock).to.have.been.called;

      expect(dispatchMock).to.have.been.calledWith(sinon.match.instanceOf(Function));
    });

    it('should do nothing with a new player that is not unique', () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([], undefined, undefined, [getNewPlayer()]);

      addNewPlayer(getNewPlayer())(dispatchMock, getStateMock, undefined);

      expect(getStateMock).to.have.been.called;

      expect(dispatchMock).to.not.have.been.called;
    });
  }); // describe('addNewPlayer')

  describe('savePlayer', () => {
    it('should save to storage and dispatch an action to add player', async () => {
      const expectedId = 'randomGeneratedPlayerID45234';
      const expectedSavedPlayer: Player = {
        ...getNewPlayerData(),
        id: expectedId,
      };
      const currentTeam: Team = getStoredTeam();

      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([currentTeam], currentTeam, {
        signedIn: true,
        userId: TEST_USER_ID,
      });
      const saveNewDocumentStub = writerStub.saveNewDocument.callsFake((model) => {
        model.id = expectedId;
        return Promise.resolve();
      });

      const inputPlayer = getNewPlayer();
      await savePlayer(inputPlayer)(dispatchMock, getStateMock, undefined);

      // Checks that the new player was saved to the database.
      expect(saveNewDocumentStub).calledOnceWith(
        inputPlayer,
        `${KEY_TEAMS}/${currentTeam.id}/${KEY_ROSTER}`,
        sinon.match.object,
      );
      expect(inputPlayer, 'Input player should have properties set by saving').to.deep.equal(
        expectedSavedPlayer,
      );

      // Waits for promises to resolve.
      await Promise.resolve();
      expect(dispatchMock).to.have.been.calledWith({
        type: addPlayer.type,
        payload: expectedSavedPlayer,
      });
    });

    it('should not dispatch an action when storage access fails', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([], undefined);
      writerStub.saveNewDocument.onFirstCall().throws(() => {
        return new Error('Storage failed with some error');
      });

      let rejected = false;
      try {
        await savePlayer(getNewPlayer())(dispatchMock, getStateMock, undefined);
      } catch {
        rejected = true;
      }
      expect(rejected, 'savePlayer should reject promise').to.be.true;

      expect(dispatchMock).to.not.have.been.called;
    });
  }); // describe('savePlayer')

  describe('addPlayer', () => {
    let currentState: TeamState;
    let newPlayer: Player;
    let existingPlayer: Player;

    beforeEach(() => {
      newPlayer = getNewPlayer();
      existingPlayer = getStoredPlayer();
    });

    it('should add new player to empty roster', () => {
      currentState = buildInitialTeamState();

      const newState = team(currentState, addPlayer(newPlayer));

      expect(newState).to.deep.include({
        roster: buildRoster([newPlayer]),
      });

      expect(newState).to.not.equal(currentState);
      expect(newState.roster).to.not.equal(currentState.roster);
    });

    it('should add new player to roster with existing players', () => {
      currentState = buildTeamStateWithTeams(undefined, { roster: buildRoster([existingPlayer]) });

      const newState = team(currentState, addPlayer(newPlayer));

      expect(newState).to.deep.include({
        roster: buildRoster([existingPlayer, newPlayer]),
      });

      expect(newState).to.not.equal(currentState);
      expect(newState.roster).to.not.equal(currentState.roster);
    });
  }); // describe('addPlayer')
}); // describe('Team slice')
