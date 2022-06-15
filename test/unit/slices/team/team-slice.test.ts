import { Player } from '@app/models/player';
import { Team, Teams, TeamData } from '@app/models/team';
import { addNewPlayer, addNewTeam, savePlayer, saveTeam, team, TeamState } from '@app/slices/team/team-slice';
import { expect } from '@open-wc/testing';
import {
  buildRoster, buildTeams,
  getFakeAction,
  getNewPlayer,
  getStoredPlayer, getStoredTeam, getPublicTeam, getMockAuthState, getNewPlayerData,
  MockAuthStateOptions, TEST_USER_ID
} from '../../helpers/test_data.js';

import { addPlayer, addTeam, changeTeam, getRoster, getTeams } from '@app/slices/team/team-slice';
import { reader } from '@app/storage/firestore-reader';
import { writer } from '@app/storage/firestore-writer';
import { idb } from '@app/storage/idb-wrapper';
import sinon from 'sinon';

const actionTypes = {
  ADD_PLAYER: 'team/addPlayer',
  ADD_TEAM: 'team/addTeam',
  CHANGE_TEAM: 'team/changeTeam',
  GET_ROSTER: 'team/getRoster',
  GET_TEAMS: 'team/getTeams',

  fulfilled(typePrefix: string) {
    return `${typePrefix}/fulfilled`;
  },

  rejected(typePrefix: string) {
    return `${typePrefix}/rejected`;
  },
};

const TEAM_INITIAL_STATE: TeamState = {
  teams: {} as Teams,
  teamId: '',
  teamName: '',
  roster: {},
  error: ''
};

const KEY_TEAMS = 'teams';
const KEY_TEAMID = 'teamId';
const KEY_ROSTER = 'roster';

export function getNewTeamData() {
  return { name: 'New team 1' }
};

// New team created by the UI does not have an ID until added to storage.
function getNewTeam(): TeamData {
  return {
    ...getNewTeamData()
  };
}
const newTeamSaved: Team = {
  ...getNewTeam(),
  id: 'somerandomid'
};

function mockGetState(teams: Team[], currentTeam?: Team, options?: MockAuthStateOptions, players?: Player[]) {
  return sinon.fake(() => {
    const teamData = buildTeams(teams);
    const rosterData = buildRoster(players);

    return {
      auth: getMockAuthState(options),
      team: {
        teamId: currentTeam ? currentTeam.id : '',
        teamName: currentTeam ? currentTeam.name : '',
        teams: teamData,
        roster: rosterData
      }
    };
  });
}

describe('Teams reducer', () => {
  const newTeam: Team = {
    id: 'nt1', name: 'New team 1'
  };

  it('should return the initial state', () => {
    expect(
      team(TEAM_INITIAL_STATE, getFakeAction())
    ).to.equal(TEAM_INITIAL_STATE);
  });

  it('should return the initial state when none provided', () => {
    expect(
      team(undefined, getFakeAction())
    ).to.deep.equal(TEAM_INITIAL_STATE);
  });

  describe('GET_TEAMS', () => {
    it('should set the teams state to the retrieved list', () => {
      const expectedTeams = buildTeams([getStoredTeam()]);

      const newState = team(TEAM_INITIAL_STATE, {
        type: actionTypes.fulfilled(actionTypes.GET_TEAMS),
        payload: {
          teams: expectedTeams
        }
      });

      expect(newState).to.deep.include({
        teams: expectedTeams,
      });

      expect(newState.teams).to.not.equal(TEAM_INITIAL_STATE.teams);
    });

    it('should set the current team when selectedTeamId provided', () => {
      const storedTeam = getStoredTeam();
      const expectedTeams = buildTeams([storedTeam, getPublicTeam()]);

      const newState = team(TEAM_INITIAL_STATE, {
        type: actionTypes.fulfilled(actionTypes.GET_TEAMS),
        payload: {
          teams: expectedTeams,
          selectedTeamId: storedTeam.id
        }
      });

      expect(newState).to.deep.include({
        teams: expectedTeams,
        teamId: storedTeam.id,
        teamName: storedTeam.name
      });

      expect(newState.teams).to.not.equal(TEAM_INITIAL_STATE.teams);
    });

    it('should ignore the selectedTeamId when current team already set', () => {
      const storedTeam = getStoredTeam();
      const currentState: TeamState = {
        ...TEAM_INITIAL_STATE,
        teamId: storedTeam.id,
        teamName: storedTeam.name
      }
      const expectedTeams = buildTeams([storedTeam, getPublicTeam()]);

      const newState = team(currentState, {
        type: actionTypes.fulfilled(actionTypes.GET_TEAMS),
        payload: {
          teams: expectedTeams,
          selectedTeamId: getPublicTeam().id
        }
      });

      expect(newState).to.deep.include({
        teams: expectedTeams,
        teamId: storedTeam.id,
        teamName: storedTeam.name
      });

      expect(newState.teams).to.not.equal(TEAM_INITIAL_STATE.teams);
    });

    it('should ignore the selectedTeamId when not in the team list', () => {
      const storedTeam = getStoredTeam();
      const expectedTeams = buildTeams([storedTeam]);

      const newState = team(TEAM_INITIAL_STATE, {
        type: actionTypes.fulfilled(actionTypes.GET_TEAMS),
        payload: {
          teams: expectedTeams,
          selectedTeamId: getPublicTeam().id
        }
      });

      expect(newState).to.include({
        teams: expectedTeams
      });
      expect(newState.teamId).to.not.be.ok;
      expect(newState.teamName).to.not.be.ok;

      expect(newState.teams).to.not.equal(TEAM_INITIAL_STATE.teams);
    });
  }); // describe('GET_TEAMS')

  describe('CHANGE_TEAM', () => {
    it('should update the current team id and name', () => {
      const state = {
        ...TEAM_INITIAL_STATE,
        teams: {} as Teams
      } as TeamState;
      state.teams = buildTeams([getStoredTeam(), newTeam]);

      const newState = team(state, {
        type: actionTypes.CHANGE_TEAM,
        payload: { teamId: newTeam.id }
      });

      expect(newState).to.include({
        teamId: newTeam.id,
        teamName: newTeam.name
      });

      expect(newState).to.not.equal(state);
      expect(newState.teamId).to.not.equal(state.teamId);
      expect(newState.teamName).to.not.equal(state.teamName);
    });

    it('should do nothing if no teams exist', () => {
      const state = {
        ...TEAM_INITIAL_STATE,
        teams: {} as Teams
      } as TeamState;

      const newState = team(state, {
        type: actionTypes.CHANGE_TEAM,
        payload: { teamId: getStoredTeam().id }
      });

      expect(newState).to.equal(state);
    });

    it('should do nothing if team id does not exist', () => {
      const state = {
        ...TEAM_INITIAL_STATE,
        teams: {} as Teams
      } as TeamState;
      state.teams = buildTeams([getStoredTeam(), newTeam]);

      const newState = team(state, {
        type: actionTypes.CHANGE_TEAM,
        payload: { teamId: 'nosuchid' }
      });

      expect(newState).to.equal(state);
    });

    it('should do nothing if team id already set as current team', () => {
      const storedTeam = getStoredTeam();
      const state = {
        ...TEAM_INITIAL_STATE,
        teamId: storedTeam.id,
        teamName: storedTeam.name,
        teams: {} as Teams
      } as TeamState;
      state.teams = buildTeams([storedTeam]);

      const newState = team(state, {
        type: actionTypes.CHANGE_TEAM,
        payload: { teamId: storedTeam.id }
      });

      expect(newState).to.equal(state);
    });

  }); // describe('CHANGE_TEAM')

  describe('ADD_TEAM', () => {
    it('should populate an empty teams list and set the current team', () => {
      const expectedTeams = buildTeams([newTeam]);

      const newState = team(TEAM_INITIAL_STATE, {
        type: actionTypes.ADD_TEAM,
        payload: newTeam
      });

      expect(newState).to.deep.include({
        teams: expectedTeams,
        teamId: newTeam.id,
        teamName: newTeam.name
      });

      expect(newState).to.not.equal(TEAM_INITIAL_STATE);
      expect(newState.teams).to.not.equal(TEAM_INITIAL_STATE.teams);
    });

    it('should add to existing teams list and set the current team', () => {
      const state: TeamState = {
        ...TEAM_INITIAL_STATE
      };
      state.teams = buildTeams([getStoredTeam()]);

      const expectedTeams = buildTeams([getStoredTeam(), newTeam]);

      const newState = team(state, {
        type: actionTypes.ADD_TEAM,
        payload: newTeam
      });

      expect(newState).to.deep.include({
        teams: expectedTeams,
        teamId: newTeam.id,
        teamName: newTeam.name
      });

      expect(newState).to.not.equal(state);
      expect(newState.teams).to.not.equal(state.teams);
    });
  }); // describe('ADD_TEAM')

  describe('ADD_PLAYER', () => {
    let newPlayer: Player;
    let existingPlayer: Player;

    beforeEach(() => {
      newPlayer = getNewPlayer();
      existingPlayer = getStoredPlayer();
    });

    it('should add new player to empty roster', () => {
      const newState = team(TEAM_INITIAL_STATE, {
        type: actionTypes.ADD_PLAYER,
        payload: newPlayer
      });

      expect(newState).to.deep.include({
        roster: buildRoster([newPlayer]),
      });

      expect(newState).to.not.equal(TEAM_INITIAL_STATE);
      expect(newState.roster).to.not.equal(TEAM_INITIAL_STATE.roster);
    });

    it('should add new player to roster with existing players', () => {
      const state: TeamState = {
        ...TEAM_INITIAL_STATE
      };
      state.roster = buildRoster([existingPlayer]);

      const newState = team(state, {
        type: actionTypes.ADD_PLAYER,
        payload: newPlayer
      });

      expect(newState).to.deep.include({
        roster: buildRoster([existingPlayer, newPlayer]),
      });

      expect(newState).to.not.equal(state);
      expect(newState.roster).to.not.equal(state.roster);
    });

  }); // describe('ADD_PLAYER')

});

describe('Team actions', () => {
  let readerStub: sinon.SinonStubbedInstance<typeof reader>;
  let writerStub: sinon.SinonStubbedInstance<typeof writer>;
  let mockedIDBGet: sinon.SinonStub;
  let mockedIDBSet: sinon.SinonStub;

  beforeEach(() => {
    sinon.restore();

    readerStub = sinon.stub<typeof reader>(reader);
    writerStub = sinon.stub<typeof writer>(writer);

    mockedIDBGet = sinon.stub(idb, 'get').resolves(undefined);
    mockedIDBSet = sinon.stub(idb, 'set').resolves(undefined);
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
    it('should dispatch an action with owned teams returned from storage, without cached team id', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([], undefined, { signedIn: true, userId: TEST_USER_ID })
      const loadCollectionStub = mockLoadCollectionWithStoredTeams();

      await getTeams()(dispatchMock, getStateMock, undefined);

      // Checks that the cached team id was retrieved from IDB.
      expect(mockedIDBGet).to.have.callCount(1);
      expect(mockedIDBGet).to.have.been.calledWith(KEY_TEAMID);

      expect(dispatchMock).to.have.been.calledWith(sinon.match({
        type: actionTypes.fulfilled(actionTypes.GET_TEAMS),
        payload: {
          teams: buildTeams([getStoredTeam()]),
        }
      }));

      expect(loadCollectionStub, 'loadCollection').to.have.callCount(1);
    });

    it('should dispatch an action with owned teams returned from storage, with cached team id', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([], undefined, { signedIn: true, userId: TEST_USER_ID })
      mockLoadCollectionWithStoredTeams();
      const previousTeam = getStoredTeam();
      mockedIDBGet.onFirstCall().resolves(previousTeam.id);

      await getTeams(undefined)(dispatchMock, getStateMock, undefined);

      expect(dispatchMock).to.have.been.calledWith(sinon.match({
        type: actionTypes.fulfilled(actionTypes.GET_TEAMS),
        payload: {
          teams: buildTeams([getStoredTeam()]),
          selectedTeamId: previousTeam.id
        }
      }));
    });

    it('should dispatch an action with owned teams returned from storage, with override to cached team id', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([], undefined, { signedIn: true, userId: TEST_USER_ID })
      mockLoadCollectionWithStoredTeams();
      const previousTeam = getStoredTeam();
      mockedIDBGet.onFirstCall().resolves(previousTeam.id);

      await getTeams('idfromurl')(dispatchMock, getStateMock, undefined);

      expect(dispatchMock).to.have.been.calledWith(sinon.match({
        type: actionTypes.fulfilled(actionTypes.GET_TEAMS),
        payload: {
          teams: buildTeams([getStoredTeam()]),
          selectedTeamId: 'idfromurl'
        }
      }));
    });

    it('should dispatch an action with owned teams returned from storage, with already selected team', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([], getStoredTeam(), { signedIn: true, userId: TEST_USER_ID })
      mockLoadCollectionWithStoredTeams();

      await getTeams()(dispatchMock, getStateMock, undefined);

      expect(mockedIDBGet).to.not.have.been.called;

      expect(dispatchMock).to.have.been.calledWith(sinon.match({
        type: actionTypes.fulfilled(actionTypes.GET_TEAMS),
        payload: {
          teams: buildTeams([getStoredTeam()]),
        }
      }));
    });

    it('should dispatch an action with public teams when not signed in', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([], undefined, { signedIn: false })
      mockLoadCollectionWithPublicTeams();

      await getTeams(undefined)(dispatchMock, getStateMock, undefined);

      expect(mockedIDBGet).to.not.have.been.called;

      expect(dispatchMock).to.have.been.calledWith(sinon.match({
        type: actionTypes.fulfilled(actionTypes.GET_TEAMS),
        payload: {
          teams: buildTeams([getPublicTeam()]),
        }
      }));
    });

    it('should dispatch an action with public teams when not signed in, with selected team id', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([], undefined, { signedIn: false })
      mockLoadCollectionWithPublicTeams();

      await getTeams('idfromurl')(dispatchMock, getStateMock, undefined);

      expect(mockedIDBGet).to.not.have.been.called;

      expect(dispatchMock).to.have.been.calledWith(sinon.match({
        type: actionTypes.fulfilled(actionTypes.GET_TEAMS),
        payload: {
          teams: buildTeams([getPublicTeam()]),
          selectedTeamId: 'idfromurl'
        }
      }));
    });

    it('should not dispatch an action when storage access fails', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([], undefined, { signedIn: true, userId: TEST_USER_ID });
      readerStub.loadCollection.onFirstCall().throws(() => { return new Error('Storage failed with some error'); });

      await getTeams()(dispatchMock, getStateMock, undefined);

      expect(dispatchMock).to.have.been.calledWith(sinon.match({
        type: actionTypes.rejected(actionTypes.GET_TEAMS),
        error: { message: 'Storage failed with some error' }
      }));
    });

  }); // describe('getTeams')

  describe('changeTeam', () => {
    it('should return an action to change the selected team', async () => {
      expect(changeTeam(newTeamSaved.id)).to.deep.equal({
        type: changeTeam.type,
        payload: { teamId: newTeamSaved.id },
      });
    });
  }); // describe('changeTeam')

  describe('addNewTeam', () => {
    it('should return a function to dispatch the action', () => {
      expect(addNewTeam()).to.be.instanceof(Function);
    });

    it('should do nothing if new team is missing', () => {
      const dispatchMock = sinon.stub();
      const getStateMock = sinon.stub();

      addNewTeam()(dispatchMock, getStateMock, undefined);

      expect(getStateMock).to.not.have.been.called;

      expect(dispatchMock).to.not.have.been.called;
    });

    it('should dispatch an action to add a new team that is unique', () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([{ id: 'EX', name: 'Existing team' }]);

      addNewTeam(getNewTeam())(dispatchMock, getStateMock, undefined);

      expect(getStateMock).to.have.been.called;

      expect(dispatchMock).to.have.been.calledWith(sinon.match.instanceOf(Function));
    });

    it('should do nothing with a new team that is not unique', () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([newTeamSaved]);

      addNewTeam(getNewTeam())(dispatchMock, getStateMock, undefined);

      expect(getStateMock).to.have.been.called;

      expect(dispatchMock).to.not.have.been.called;
    });
  }); // describe('addNewTeam')

  describe('saveTeam', () => {
    it('should return a function to dispatch the action', () => {
      expect(saveTeam()).to.be.instanceof(Function);
    });

    it('should save to storage and dispatch an action to add team', async () => {
      const expectedId = 'randomGeneratedID45234';
      const expectedSavedTeam: Team = {
        ...getNewTeamData(),
        id: expectedId,
      };

      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([], undefined, { signedIn: true, userId: TEST_USER_ID });
      const saveNewDocumentStub = writerStub.saveNewDocument.callsFake(
        (model) => { model.id = expectedId; }
      );

      const inputTeam = getNewTeam();
      saveTeam(inputTeam)(dispatchMock, getStateMock, undefined);

      // Checks that the new team was saved to the database.
      expect(saveNewDocumentStub).calledOnceWith(
        inputTeam, KEY_TEAMS, undefined, sinon.match.object, { addUserId: true });
      expect(inputTeam, 'Input team should have properties set by saving').to.deep.equal(expectedSavedTeam);

      // Checks that the new selected team was cached in IDB.
      expect(mockedIDBSet).to.have.been.calledWith(KEY_TEAMID, expectedId);

      expect(dispatchMock).to.have.been.calledWith({
        type: addTeam.type,
        payload: expectedSavedTeam,
      });
    });

    it('should not dispatch an action when storage access fails', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = sinon.stub();
      writerStub.saveNewDocument.onFirstCall().throws(() => { return new Error('Storage failed with some error'); });

      expect(() => {
        saveTeam(getNewTeam())(dispatchMock, getStateMock, undefined);
      }).to.throw('Storage failed');

      // Waits for promises to resolve.
      await Promise.resolve();

      expect(dispatchMock).to.not.have.been.called;
    });
  }); // describe('saveTeam')

  describe('addTeam', () => {

    it('should return an action to add the team', () => {
      expect(addTeam(newTeamSaved)).to.deep.equal({
        type: addTeam.type,
        payload: newTeamSaved,
      });
    });

  }); // describe('addTeam')

  describe('getRoster', () => {
    it('should do nothing if team id is missing', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = sinon.stub();

      await getRoster('')(dispatchMock, getStateMock, undefined);

      expect(readerStub.loadCollection).to.not.have.been.called;

      expect(dispatchMock).to.not.have.been.called;
    });

    it('should dispatch an action with the roster returned from storage', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = sinon.stub();

      readerStub.loadCollection.resolves(buildRoster([getStoredPlayer()]));

      await getRoster(getStoredTeam().id)(dispatchMock, getStateMock, undefined);

      const rosterData = buildRoster([getStoredPlayer()]);
      expect(dispatchMock).to.have.been.calledWith(sinon.match({
        type: actionTypes.fulfilled(actionTypes.GET_ROSTER),
        payload: rosterData,
      }));
    });

    it('should set the roster to the retrieved list', () => {
      const expectedRoster = buildRoster([getStoredPlayer()]);

      const newState = team(TEAM_INITIAL_STATE, {
        type: actionTypes.fulfilled(actionTypes.GET_ROSTER),
        payload: expectedRoster
      });

      expect(newState).to.deep.include({
        roster: expectedRoster,
      });

      expect(newState).to.not.equal(TEAM_INITIAL_STATE);
      expect(newState.roster).to.not.equal(TEAM_INITIAL_STATE.roster);
    });

    it('should dispatch a rejected action when storage access fails', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([], undefined, { signedIn: true, userId: TEST_USER_ID });

      readerStub.loadCollection.onFirstCall().throws(() => { return new Error('Storage failed with some error'); });

      await getRoster(getStoredTeam().id)(dispatchMock, getStateMock, undefined);

      expect(dispatchMock).to.have.been.calledWith(sinon.match({
        type: actionTypes.rejected(actionTypes.GET_ROSTER),
        error: { message: 'Storage failed with some error' }
      }));

    });

  }); // describe('getRoster')

  describe('addNewPlayer', () => {
    it('should return a function to dispatch the action', () => {
      expect(addNewPlayer()).to.be.instanceof(Function);
    });

    it('should do nothing if new player is missing', () => {
      const dispatchMock = sinon.stub();
      const getStateMock = sinon.stub();

      addNewPlayer()(dispatchMock, getStateMock, undefined);

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
    it('should return a function to dispatch the action', () => {
      expect(savePlayer()).to.be.instanceof(Function);
    });

    it('should save to storage and dispatch an action to add player', async () => {
      const expectedId = 'randomGeneratedPlayerID45234';
      const expectedSavedPlayer: Player = {
        ...getNewPlayerData(),
        id: expectedId,
      };
      const team: Team = getStoredTeam();

      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([team], team, { signedIn: true, userId: TEST_USER_ID });
      const saveNewDocumentStub = writerStub.saveNewDocument.callsFake(
        (model) => { model.id = expectedId; }
      );

      const inputPlayer = getNewPlayer();
      savePlayer(inputPlayer)(dispatchMock, getStateMock, undefined);

      // Waits for promises to resolve.
      await Promise.resolve();

      // Checks that the new player was saved to the database.
      expect(saveNewDocumentStub).calledOnceWith(
        inputPlayer, `${KEY_TEAMS}/${team.id}/${KEY_ROSTER}`, sinon.match.object);
      expect(inputPlayer, 'Input player should have properties set by saving').to.deep.equal(expectedSavedPlayer);

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
      writerStub.saveNewDocument.onFirstCall().throws(() => { return new Error('Storage failed with some error'); });

      expect(() => {
        savePlayer(getNewPlayer())(dispatchMock, getStateMock, undefined);
      }).to.throw('Storage failed');

      // Waits for promises to resolve.
      await Promise.resolve();

      expect(dispatchMock).to.not.have.been.called;
    });
  }); // describe('savePlayer')

  describe('addPlayer', () => {
    it('should dispatch an action to add the player', () => {
      expect(addPlayer(getNewPlayer())).to.deep.equal({
        type: addPlayer.type,
        payload: getNewPlayer(),
      });
    });

  }); // describe('addPlayer')

}); // describe('Team actions')
