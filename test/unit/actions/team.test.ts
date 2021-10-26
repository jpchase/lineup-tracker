import * as actions from '@app/actions/team';
import { firebaseRef } from '@app/firebase';
import { Player } from '@app/models/player';
import { Team, TeamData } from '@app/models/team';
import * as actionTypes from '@app/slices/team-types';
import { reader } from '@app/storage/firestore-reader';
import { writer } from '@app/storage/firestore-writer';
import { idb } from '@app/storage/idb-wrapper';
import { DocumentData, Query, QueryDocumentSnapshot, QuerySnapshot } from '@firebase/firestore-types';
import { expect, nextFrame } from '@open-wc/testing';
import * as sinon from 'sinon';
import { getMockFirebase, mockFirestoreAccessor } from '../helpers/mock-firebase-factory';
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
  let mockFirebase: any;
  let firestoreAccessorStub: sinon.SinonStub;
  let readerStub: sinon.SinonStubbedInstance<typeof reader>;
  let writerStub: sinon.SinonStubbedInstance<typeof writer>;
  let mockedIDBGet: sinon.SinonStub;
  let mockedIDBSet: sinon.SinonStub;

  beforeEach(() => {
    sinon.restore();

    mockFirebase = getMockFirebase();
    firestoreAccessorStub = mockFirestoreAccessor(mockFirebase);
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
        teams: buildTeams([getStoredTeam()]),
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
        teams: buildTeams([getStoredTeam()]),
        cachedTeamId: previousTeam.id
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
        teams: buildTeams([getStoredTeam()]),
        cachedTeamId: 'idfromurl'
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
        teams: buildTeams([getStoredTeam()]),
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
        teams: buildTeams([getPublicTeam()]),
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
        teams: buildTeams([getPublicTeam()]),
        cachedTeamId: 'idfromurl'
      }));
    });

    it('should not dispatch an action when storage access fails', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = sinon.stub();

      firestoreAccessorStub.onFirstCall().throws(() => { return new Error('Storage failed with some error'); });

      expect(() => {
        actions.getTeams()(dispatchMock, getStateMock, undefined);
      }).to.throw();

      // Waits for promises to resolve.
      await Promise.resolve();

      expect(dispatchMock).to.not.have.been.called;
    });

  }); // describe('getTeams')

  describe('changeTeam', () => {
    it('should return a function to dispatch the action', () => {
      expect(actions.changeTeam()).to.be.instanceof(Function);
    });

    it('should do nothing if no teams exist', () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([]);

      actions.changeTeam(getStoredTeam().id)(dispatchMock, getStateMock, undefined);

      expect(getStateMock).to.have.been.called;

      expect(dispatchMock).to.not.have.been.called;
    });

    it('should do nothing if team id does not exist', () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([getStoredTeam()]);

      actions.changeTeam('nosuchid')(dispatchMock, getStateMock, undefined);

      expect(getStateMock).to.have.been.called;

      expect(dispatchMock).to.not.have.been.called;
    });

    it('should do nothing if team id already set as current team', () => {
      const storedTeam = getStoredTeam();
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([storedTeam], storedTeam);

      actions.changeTeam(storedTeam.id)(dispatchMock, getStateMock, undefined);

      expect(getStateMock).to.have.been.called;

      expect(dispatchMock).to.not.have.been.called;
    });

    it('should dispatch an action to change the selected team', async () => {
      const storedTeam = getStoredTeam();
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([storedTeam, newTeamSaved], storedTeam);

      actions.changeTeam(newTeamSaved.id)(dispatchMock, getStateMock, undefined);

      expect(getStateMock).to.have.been.called;

      // Checks that the changed team was cached in IDB.
      expect(mockedIDBSet).to.have.been.calledWith(KEY_TEAMID, newTeamSaved.id);

      expect(dispatchMock).to.have.been.calledWith({
        type: actionTypes.CHANGE_TEAM,
        teamId: newTeamSaved.id,
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
        inputTeam, KEY_TEAMS, sinon.match.object, { addUserId: true });
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
      }).to.throw();

      // Waits for promises to resolve.
      await Promise.resolve();

      expect(dispatchMock).to.not.have.been.called;
    });
  }); // describe('saveTeam')

  describe('addTeam', () => {

    it('should return an action to add the team', () => {
      const dispatchMock = sinon.stub();

      actions.addTeam(newTeamSaved);

      expect(actions.addTeam(newTeamSaved)).to.deep.equal({
        type: actionTypes.ADD_TEAM,
        payload: newTeamSaved,
      });

      expect(dispatchMock).to.not.have.been.called;

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

      expect(firebaseRef.firestore).to.not.have.been.called;

      expect(dispatchMock).to.not.have.been.called;
    });

    it('should dispatch an action with the roster returned from storage', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = sinon.stub();

      const rosterData = buildRoster([getStoredPlayer()]);

      actions.getRoster(getStoredTeam().id)(dispatchMock, getStateMock, undefined);

      // Waits for promises to resolve.
      await nextFrame();

      expect(dispatchMock).to.have.been.calledWith({
        type: actionTypes.GET_ROSTER,
        roster: rosterData,
      });
    });

    it('should not dispatch an action when storage access fails', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = sinon.stub();

      firestoreAccessorStub.onFirstCall().throws(() => { return new Error('Storage failed with some error'); });

      expect(() => {
        actions.getRoster(getStoredTeam().id)(dispatchMock, getStateMock, undefined);
      }).to.throw();

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
      const dispatchMock = sinon.stub();

      const team: Team = getStoredTeam();
      const getStateMock = mockGetState([team], team, { signedIn: true, userId: TEST_USER_ID });

      actions.savePlayer(getNewPlayer())(dispatchMock, getStateMock, undefined);

      // Waits for promises to resolve.
      await Promise.resolve();

      // Checks that the new player was saved to the database.
      const newPlayerSaved = getNewPlayer();
      const path = `${KEY_TEAMS}/${team.id}/${KEY_ROSTER}`;
      const query: Query = mockFirebase.firestore().collection(path).where('name', '==', newPlayerSaved.name);
      const result: QuerySnapshot = await query.get();
      expect(result.size).to.equal(1);

      const expectedData: any = {
        ...getNewPlayerData()
      };

      let id = '';
      let data: DocumentData = {};
      result.forEach((doc: QueryDocumentSnapshot) => {
        id = doc.id;
        data = doc.data();
      });

      expect(id).to.be.ok;
      expect(id).to.match(/[A-Za-z0-9]+/);
      expect(data).to.deep.equal(expectedData);

      // Waits for promises to resolve.
      await Promise.resolve();
      expect(dispatchMock).to.have.been.calledWith(sinon.match.instanceOf(Function));
    });

    it('should not dispatch an action when storage access fails', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = sinon.stub();
      firestoreAccessorStub.onFirstCall().throws(() => { return new Error('Storage failed with some error'); });

      expect(() => {
        actions.savePlayer(getNewPlayer())(dispatchMock, getStateMock, undefined);
      }).to.throw();

      // Waits for promises to resolve.
      await Promise.resolve();

      expect(dispatchMock).to.not.have.been.called;
    });
  }); // describe('savePlayer')

  describe('addPlayer', () => {
    it('should return a function to dispatch the addPlayer action', () => {
      expect(actions.addPlayer()).to.be.instanceof(Function);
    });

    it('should dispatch an action to add the player', () => {
      const dispatchMock = sinon.stub();
      const getStateMock = sinon.stub();

      actions.addPlayer(getNewPlayer())(dispatchMock, getStateMock, undefined);

      expect(dispatchMock).to.have.been.calledWith({
        type: actionTypes.ADD_PLAYER,
        player: getNewPlayer(),
      });
    });

  }); // describe('addPlayer')

}); // describe('Team actions')
