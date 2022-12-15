import { Player } from '@app/models/player.js';
import { Team, TeamData } from '@app/models/team.js';
import { addNewPlayer, addNewTeam, addPlayer, addTeam, getRoster, getTeams, savePlayer, saveTeam, team, TeamState, TEAM_INITIAL_STATE } from '@app/slices/team/team-slice.js';
import { reader } from '@app/storage/firestore-reader.js';
import { writer } from '@app/storage/firestore-writer.js';
import { expect } from '@open-wc/testing';
import sinon from 'sinon';
import {
  buildRoster, buildTeams,
  getNewPlayer,
  getStoredPlayer, getStoredTeam, getPublicTeam, getMockAuthState, getNewPlayerData,
  MockAuthStateOptions, TEST_USER_ID
} from '../../helpers/test_data.js';

const actionTypes = {
  ADD_PLAYER: 'team/addPlayer',
  GET_ROSTER: 'team/getRoster',
  GET_TEAMS: 'team/getTeams',

  fulfilled(typePrefix: string) {
    return `${typePrefix}/fulfilled`;
  },

  rejected(typePrefix: string) {
    return `${typePrefix}/rejected`;
  },
};

const KEY_TEAMS = 'teams';
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
      app: {
        teamId: currentTeam ? currentTeam.id : undefined,
        teamName: currentTeam ? currentTeam.name : undefined,
      },
      auth: getMockAuthState(options),
      team: {
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

  describe('getTeams', () => {
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
        teamsLoading: false,
        teamsLoaded: true,
      });

      expect(newState.teams).to.not.equal(TEAM_INITIAL_STATE.teams);
    });
  }); // describe('getTeams')

  describe('ADD_TEAM', () => {
    it('should populate an empty teams list', () => {
      const expectedTeams = buildTeams([newTeam]);

      const newState = team(TEAM_INITIAL_STATE, addTeam(newTeam));

      expect(newState).to.deep.include({
        teams: expectedTeams
      });

      expect(newState).to.not.equal(TEAM_INITIAL_STATE);
      expect(newState.teams).to.not.equal(TEAM_INITIAL_STATE.teams);
    });

    it('should add to existing teams list', () => {
      const state: TeamState = {
        ...TEAM_INITIAL_STATE
      };
      state.teams = buildTeams([getStoredTeam()]);

      const expectedTeams = buildTeams([getStoredTeam(), newTeam]);

      const newState = team(state, addTeam(newTeam));

      expect(newState).to.deep.include({
        teams: expectedTeams
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
    it('should dispatch an action with owned teams returned from storage', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([], undefined, { signedIn: true, userId: TEST_USER_ID })
      const loadCollectionStub = mockLoadCollectionWithStoredTeams();

      await getTeams()(dispatchMock, getStateMock, undefined);

      expect(dispatchMock).to.have.been.calledWith(sinon.match({
        type: actionTypes.fulfilled(actionTypes.GET_TEAMS),
        payload: {
          teams: buildTeams([getStoredTeam()]),
        }
      }));

      expect(loadCollectionStub, 'loadCollection').to.have.callCount(1);
    });

    it('should dispatch an action with public teams when not signed in', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([], undefined, { signedIn: false })
      mockLoadCollectionWithPublicTeams();

      await getTeams()(dispatchMock, getStateMock, undefined);

      expect(dispatchMock).to.have.been.calledWith(sinon.match({
        type: actionTypes.fulfilled(actionTypes.GET_TEAMS),
        payload: {
          teams: buildTeams([getPublicTeam()]),
        }
      }));
    });

    it('should dispatch rejected action when storage access fails', async () => {
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

  describe('addNewTeam', () => {
    it('should do nothing if new team is missing', () => {
      const dispatchMock = sinon.stub();
      const getStateMock = sinon.stub();

      addNewTeam(undefined as unknown as Team)(dispatchMock, getStateMock, undefined);

      expect(getStateMock).to.not.have.been.called;

      expect(dispatchMock).to.not.have.been.called;
    });

    it('should dispatch an action to add a new team that is unique', () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([{ id: 'EX', name: 'Existing team' }]);

      addNewTeam(getNewTeam() as Team)(dispatchMock, getStateMock, undefined);

      expect(getStateMock).to.have.been.called;

      expect(dispatchMock).to.have.been.calledWith(sinon.match.instanceOf(Function));
    });

    it('should do nothing with a new team that is not unique', () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([newTeamSaved]);

      addNewTeam(getNewTeam() as Team)(dispatchMock, getStateMock, undefined);

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
      const saveNewDocumentStub = writerStub.saveNewDocument.callsFake(
        (model) => { model.id = expectedId; }
      );

      const inputTeam = getNewTeam();
      saveTeam(inputTeam as Team)(dispatchMock, getStateMock, undefined);

      // Checks that the new team was saved to the database.
      expect(saveNewDocumentStub).calledOnceWith(
        inputTeam, KEY_TEAMS, undefined, sinon.match.object, { addUserId: true });
      expect(inputTeam, 'Input team should have properties set by saving').to.deep.equal(expectedSavedTeam);

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
        saveTeam(getNewTeam() as Team)(dispatchMock, getStateMock, undefined);
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
