import * as actions from '@app/actions/team';
import { Player } from '@app/models/player';
import { Team, TeamData } from '@app/models/team';
import * as actionTypes from '@app/slices/team-types';
import { reader } from '@app/storage/firestore-reader';
import { writer } from '@app/storage/firestore-writer';
import { idb } from '@app/storage/idb-wrapper';
import { expect, nextFrame } from '@open-wc/testing';
import * as sinon from 'sinon';
import {
  buildRoster, buildTeams, getMockAuthState, getNewPlayer, getNewPlayerData, getPublicTeam,
  getStoredPlayer, getStoredTeam, MockAuthStateOptions, TEST_USER_ID
} from '../helpers/test_data';

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
    it('should return a function to dispatch the getTeams action', () => {
      expect(actions.getTeams()).to.be.instanceof(Function);
    });

    it('should dispatch an action with owned teams returned from storage, without cached team id', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([], undefined, { signedIn: true, userId: TEST_USER_ID })
      const loadCollectionStub = mockLoadCollectionWithStoredTeams();

      actions.getTeams()(dispatchMock, getStateMock, undefined);

      // Waits for promises to resolve.
      await Promise.resolve();

      // Checks that the cached team id was retrieved from IDB.
      expect(mockedIDBGet).to.have.callCount(1);
      expect(mockedIDBGet).to.have.been.calledWith(KEY_TEAMID);

      expect(dispatchMock).to.have.been.calledWith(sinon.match({
        type: actionTypes.GET_TEAMS,
        payload: {
          teams: buildTeams([getStoredTeam()]),
        }
      }));

      expect(loadCollectionStub).to.have.callCount(1);
    });

    it('should dispatch an action with owned teams returned from storage, with cached team id', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([], undefined, { signedIn: true, userId: TEST_USER_ID })
      mockLoadCollectionWithStoredTeams();
      const previousTeam = getStoredTeam();
      mockedIDBGet.onFirstCall().resolves(previousTeam.id);

      actions.getTeams(null)(dispatchMock, getStateMock, undefined);

      // Waits for promises to resolve.
      await Promise.resolve();

      expect(dispatchMock).to.have.been.calledWith(sinon.match({
        type: actionTypes.GET_TEAMS,
        payload: {
          teams: buildTeams([getStoredTeam()]),
          cachedTeamId: previousTeam.id
        }
      }));
    });

    it('should dispatch an action with owned teams returned from storage, with override to cached team id', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([], undefined, { signedIn: true, userId: TEST_USER_ID })
      mockLoadCollectionWithStoredTeams();
      const previousTeam = getStoredTeam();
      mockedIDBGet.onFirstCall().resolves(previousTeam.id);

      actions.getTeams('idfromurl')(dispatchMock, getStateMock, undefined);

      // Waits for promises to resolve.
      await Promise.resolve();

      expect(dispatchMock).to.have.been.calledWith(sinon.match({
        type: actionTypes.GET_TEAMS,
        payload: {
          teams: buildTeams([getStoredTeam()]),
          cachedTeamId: 'idfromurl'
        }
      }));
    });

    it('should dispatch an action with owned teams returned from storage, with already selected team', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([], getStoredTeam(), { signedIn: true, userId: TEST_USER_ID })
      mockLoadCollectionWithStoredTeams();

      actions.getTeams()(dispatchMock, getStateMock, undefined);

      // Waits for promises to resolve.
      await Promise.resolve();

      expect(mockedIDBGet).to.not.have.been.called;

      expect(dispatchMock).to.have.been.calledWith(sinon.match({
        type: actionTypes.GET_TEAMS,
        payload: {
          teams: buildTeams([getStoredTeam()]),
        }
      }));
    });

    it('should dispatch an action with public teams when not signed in', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([], undefined, { signedIn: false })
      mockLoadCollectionWithPublicTeams();

      actions.getTeams(null)(dispatchMock, getStateMock, undefined);

      // Waits for promises to resolve.
      await Promise.resolve();

      expect(mockedIDBGet).to.not.have.been.called;

      expect(dispatchMock).to.have.been.calledWith(sinon.match({
        type: actionTypes.GET_TEAMS,
        payload: {
          teams: buildTeams([getPublicTeam()]),
        }
      }));
    });

    it('should dispatch an action with public teams when not signed in, with selected team id', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([], undefined, { signedIn: false })
      mockLoadCollectionWithPublicTeams();

      actions.getTeams('idfromurl')(dispatchMock, getStateMock, undefined);

      // Waits for promises to resolve.
      await Promise.resolve();

      expect(mockedIDBGet).to.not.have.been.called;

      expect(dispatchMock).to.have.been.calledWith(sinon.match({
        type: actionTypes.GET_TEAMS,
        payload: {
          teams: buildTeams([getPublicTeam()]),
          cachedTeamId: 'idfromurl'
        }
      }));
    });

    it('should not dispatch an action when storage access fails', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([], undefined, { signedIn: true, userId: TEST_USER_ID })

      readerStub.loadCollection.onFirstCall().throws(() => { return new Error('Storage failed with some error'); });

      expect(() => {
        actions.getTeams()(dispatchMock, getStateMock, undefined);
      }).to.throw('Storage failed');

      // Waits for promises to resolve.
      await Promise.resolve();

      expect(dispatchMock).to.not.have.been.called;
    });

  }); // describe('getTeams')

  describe('changeTeam', () => {
    it('should return an action to change the selected team', async () => {
      expect(actions.changeTeam(newTeamSaved.id)).to.deep.equal({
        type: actionTypes.CHANGE_TEAM,
        payload: { teamId: newTeamSaved.id },
      });
    });
  }); // describe('changeTeam')

  describe('addNewTeam', () => {
    it('should return a function to dispatch the action', () => {
      expect(actions.addNewTeam()).to.be.instanceof(Function);
    });

    it('should do nothing if new team is missing', () => {
      const dispatchMock = sinon.stub();
      const getStateMock = sinon.stub();

      actions.addNewTeam()(dispatchMock, getStateMock, undefined);

      expect(getStateMock).to.not.have.been.called;

      expect(dispatchMock).to.not.have.been.called;
    });

    it('should dispatch an action to add a new team that is unique', () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([{ id: 'EX', name: 'Existing team' }]);

      actions.addNewTeam(getNewTeam())(dispatchMock, getStateMock, undefined);

      expect(getStateMock).to.have.been.called;

      expect(dispatchMock).to.have.been.calledWith(sinon.match.instanceOf(Function));
    });

    it('should do nothing with a new team that is not unique', () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([newTeamSaved]);

      actions.addNewTeam(getNewTeam())(dispatchMock, getStateMock, undefined);

      expect(getStateMock).to.have.been.called;

      expect(dispatchMock).to.not.have.been.called;
    });
  }); // describe('addNewTeam')

  describe('saveTeam', () => {
    it('should return a function to dispatch the action', () => {
      expect(actions.saveTeam()).to.be.instanceof(Function);
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
      actions.saveTeam(inputTeam)(dispatchMock, getStateMock, undefined);

      // Checks that the new team was saved to the database.
      expect(saveNewDocumentStub).calledOnceWith(
        inputTeam, KEY_TEAMS, undefined, sinon.match.object, { addUserId: true });
      expect(inputTeam, 'Input team should have properties set by saving').to.deep.equal(expectedSavedTeam);

      // Checks that the new selected team was cached in IDB.
      expect(mockedIDBSet).to.have.been.calledWith(KEY_TEAMID, expectedId);

      expect(dispatchMock).to.have.been.calledWith({
        type: actionTypes.ADD_TEAM,
        payload: expectedSavedTeam,
      });
    });

    it('should not dispatch an action when storage access fails', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = sinon.stub();
      writerStub.saveNewDocument.onFirstCall().throws(() => { return new Error('Storage failed with some error'); });

      expect(() => {
        actions.saveTeam(getNewTeam())(dispatchMock, getStateMock, undefined);
      }).to.throw('Storage failed');

      // Waits for promises to resolve.
      await Promise.resolve();

      expect(dispatchMock).to.not.have.been.called;
    });
  }); // describe('saveTeam')

  describe('addTeam', () => {

    it('should return an action to add the team', () => {
      expect(actions.addTeam(newTeamSaved)).to.deep.equal({
        type: actionTypes.ADD_TEAM,
        payload: newTeamSaved,
      });
    });

  }); // describe('addTeam')

  describe('getRoster', () => {
    it('should return a function to dispatch the getRoster action', () => {
      expect(actions.getRoster()).to.be.instanceof(Function);
    });

    it('should do nothing if team id is missing', () => {
      const dispatchMock = sinon.stub();
      const getStateMock = sinon.stub();

      actions.getRoster()(dispatchMock, getStateMock, undefined);

      expect(readerStub.loadCollection).to.not.have.been.called;

      expect(dispatchMock).to.not.have.been.called;
    });

    it('should dispatch an action with the roster returned from storage', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = sinon.stub();

      readerStub.loadCollection.resolves(buildRoster([getStoredPlayer()]));

      actions.getRoster(getStoredTeam().id)(dispatchMock, getStateMock, undefined);

      // Waits for promises to resolve.
      await nextFrame();

      const rosterData = buildRoster([getStoredPlayer()]);
      expect(dispatchMock).to.have.been.calledWith({
        type: actionTypes.GET_ROSTER,
        payload: rosterData,
      });
    });

    it('should not dispatch an action when storage access fails', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([], undefined, { signedIn: true, userId: TEST_USER_ID });

      readerStub.loadCollection.onFirstCall().throws(() => { return new Error('Storage failed with some error'); });

      expect(() => {
        actions.getRoster(getStoredTeam().id)(dispatchMock, getStateMock, undefined);
      }).to.throw('Storage failed');

      // Waits for promises to resolve.
      await Promise.resolve();

      expect(dispatchMock).to.not.have.been.called;
    });

  }); // describe('getRoster')

  describe('addNewPlayer', () => {
    it('should return a function to dispatch the action', () => {
      expect(actions.addNewPlayer()).to.be.instanceof(Function);
    });

    it('should do nothing if new player is missing', () => {
      const dispatchMock = sinon.stub();
      const getStateMock = sinon.stub();

      actions.addNewPlayer()(dispatchMock, getStateMock, undefined);

      expect(getStateMock).to.not.have.been.called;

      expect(dispatchMock).to.not.have.been.called;
    });

    it('should dispatch an action to add a new player that is unique', () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([], undefined, undefined, [getStoredPlayer()]);

      actions.addNewPlayer(getNewPlayer())(dispatchMock, getStateMock, undefined);

      expect(getStateMock).to.have.been.called;

      expect(dispatchMock).to.have.been.calledWith(sinon.match.instanceOf(Function));
    });

    it('should do nothing with a new player that is not unique', () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([], undefined, undefined, [getNewPlayer()]);

      actions.addNewPlayer(getNewPlayer())(dispatchMock, getStateMock, undefined);

      expect(getStateMock).to.have.been.called;

      expect(dispatchMock).to.not.have.been.called;
    });
  }); // describe('addNewPlayer')

  describe('savePlayer', () => {
    it('should return a function to dispatch the action', () => {
      expect(actions.savePlayer()).to.be.instanceof(Function);
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
      actions.savePlayer(inputPlayer)(dispatchMock, getStateMock, undefined);

      // Waits for promises to resolve.
      await Promise.resolve();

      // Checks that the new player was saved to the database.
      expect(saveNewDocumentStub).calledOnceWith(
        inputPlayer, `${KEY_TEAMS}/${team.id}/${KEY_ROSTER}`, sinon.match.object);
      expect(inputPlayer, 'Input player should have properties set by saving').to.deep.equal(expectedSavedPlayer);

      // Waits for promises to resolve.
      await Promise.resolve();
      expect(dispatchMock).to.have.been.calledWith({
        type: actionTypes.ADD_PLAYER,
        payload: expectedSavedPlayer,
      });
    });

    it('should not dispatch an action when storage access fails', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([], undefined);
      writerStub.saveNewDocument.onFirstCall().throws(() => { return new Error('Storage failed with some error'); });

      expect(() => {
        actions.savePlayer(getNewPlayer())(dispatchMock, getStateMock, undefined);
      }).to.throw('Storage failed');

      // Waits for promises to resolve.
      await Promise.resolve();

      expect(dispatchMock).to.not.have.been.called;
    });
  }); // describe('savePlayer')

  describe('addPlayer', () => {
    it('should dispatch an action to add the player', () => {
      expect(actions.addPlayer(getNewPlayer())).to.deep.equal({
        type: actionTypes.ADD_PLAYER,
        payload: getNewPlayer(),
      });
    });

  }); // describe('addPlayer')

}); // describe('Team actions')
