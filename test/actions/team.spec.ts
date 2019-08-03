import * as actions from '@app/actions/team';
import { Player } from '@app/models/player';
import { Team, TeamData } from '@app/models/team';
import { firebaseRef } from '@app/firebase';
import { DocumentData, Query, QueryDocumentSnapshot, QuerySnapshot } from '@firebase/firestore-types';
/// <reference path="mock-cloud-firestore.d.ts" />
import * as MockFirebase from 'mock-cloud-firestore';
import {
  TEST_USER_ID,
  buildRoster, buildTeams,
  getMockAuthState,
  getNewPlayer, getNewPlayerData, getStoredPlayer,
  getPublicTeam, getPublicTeamData, getStoredTeam,
  MockAuthStateOptions
} from '../helpers/test_data';

jest.mock('@app/firebase');

const fixtureData = {
    __collection__: {
        teams: {
            __doc__: {
                st1: {
                    name: 'Stored team 1',
                    owner_uid: TEST_USER_ID,

                    __collection__: {
                      roster: {
                        __doc__: {
                          sp1: {
                              name: 'Stored player 1',
                              uniformNumber: 5,
                              positions: ['CB'],
                              status: 'OFF'
                          }
                        }
                      }
                    }
                },
                pt1: {
                    ...getPublicTeamData(),
                    public: true,

                    __collection__: {
                      roster: {
                        __doc__: {
                          pp1: {
                            name: 'Public player 1',
                            uniformNumber: 5,
                            positions: ['CB'],
                            status: 'OFF'
                          }
                        }
                      }
                    }
                },
            }
        }
    }
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
  return jest.fn(() => {
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
  const mockFirebase = new MockFirebase(fixtureData);

  beforeEach(() => {
    jest.resetAllMocks();

    firebaseRef.firestore.mockImplementation(() => {
      return mockFirebase.firestore();
    });
  });

describe('getTeams', () => {
  it('should return a function to dispatch the getTeams action', () => {
    expect(typeof actions.getTeams()).toBe('function');
  });

  it('should dispatch an action with owned teams returned from storage', async () => {
      const dispatchMock = jest.fn();
      const getStateMock = mockGetState([], undefined, { signedIn: true, userId: TEST_USER_ID })

      actions.getTeams()(dispatchMock, getStateMock, undefined);

      // Waits for promises to resolve.
      await Promise.resolve();

      expect(dispatchMock).toBeCalledWith(expect.objectContaining({
          type: actions.GET_TEAMS,
          teams: buildTeams([getStoredTeam()]),
      }));
  });

    it('should dispatch an action with public teams when not signed in', async () => {
      const dispatchMock = jest.fn();
      const getStateMock = mockGetState([], undefined, { signedIn: false })

      actions.getTeams()(dispatchMock, getStateMock, undefined);

      // Waits for promises to resolve.
      await Promise.resolve();

      expect(dispatchMock).toBeCalledWith(expect.objectContaining({
          type: actions.GET_TEAMS,
          teams: buildTeams([getPublicTeam()]),
      }));
    });

    it('should not dispatch an action when storage access fails', async () => {
        const dispatchMock = jest.fn();
        const getStateMock = jest.fn();

        firebaseRef.firestore.mockImplementationOnce(() => { throw new Error('Storage failed with some error'); });

        expect(() => {
          actions.getTeams()(dispatchMock, getStateMock, undefined);
        }).toThrow();

        // Waits for promises to resolve.
        await Promise.resolve();

        expect(dispatchMock).not.toBeCalled();
    });

});

describe('changeTeam', () => {
  it('should return a function to dispatch the action', () => {
    expect(typeof actions.changeTeam()).toBe('function');
  });

  it('should do nothing if no teams exist', () => {
    const dispatchMock = jest.fn();
    const getStateMock = mockGetState([]);

    actions.changeTeam(getStoredTeam().id)(dispatchMock, getStateMock, undefined);

    expect(getStateMock).toBeCalled();

    expect(dispatchMock).not.toBeCalled();
  });

  it('should do nothing if team id does not exist', () => {
    const dispatchMock = jest.fn();
    const getStateMock = mockGetState([getStoredTeam()]);

    actions.changeTeam('nosuchid')(dispatchMock, getStateMock, undefined);

    expect(getStateMock).toBeCalled();

    expect(dispatchMock).not.toBeCalled();
  });

  it('should do nothing if team id already set as current team', () => {
    const storedTeam = getStoredTeam();
    const dispatchMock = jest.fn();
    const getStateMock = mockGetState([storedTeam], storedTeam);

    actions.changeTeam(storedTeam.id)(dispatchMock, getStateMock, undefined);

    expect(getStateMock).toBeCalled();

    expect(dispatchMock).not.toBeCalled();
  });

  it('should dispatch an action to change the selected team', () => {
    const storedTeam = getStoredTeam();
    const dispatchMock = jest.fn();
    const getStateMock = mockGetState([storedTeam, newTeamSaved], storedTeam);

    actions.changeTeam(newTeamSaved.id)(dispatchMock, getStateMock, undefined);

    expect(getStateMock).toBeCalled();

    expect(dispatchMock).toBeCalledWith(expect.objectContaining({
      type: actions.CHANGE_TEAM,
      teamId: newTeamSaved.id,
    }));
  });
});

describe('addNewTeam', () => {
  it('should return a function to dispatch the action', () => {
    expect(typeof actions.addNewTeam()).toBe('function');
  });

  it('should do nothing if new team is missing', () => {
    const dispatchMock = jest.fn();
    const getStateMock = jest.fn();

    actions.addNewTeam()(dispatchMock, getStateMock, undefined);

    expect(getStateMock).not.toBeCalled();

    expect(dispatchMock).not.toBeCalled();
  });

  it('should dispatch an action to add a new team that is unique', () => {
    const dispatchMock = jest.fn();
    const getStateMock = mockGetState([{ id: 'EX', name: 'Existing team' }]);

    actions.addNewTeam(getNewTeam())(dispatchMock, getStateMock, undefined);

    expect(getStateMock).toBeCalled();

    expect(dispatchMock).toBeCalledWith(expect.any(Function));
  });

  it('should do nothing with a new team that is not unique', () => {
    const dispatchMock = jest.fn();
    const getStateMock = mockGetState([newTeamSaved]);

    actions.addNewTeam(getNewTeam())(dispatchMock, getStateMock, undefined);

    expect(getStateMock).toBeCalled();

    expect(dispatchMock).not.toBeCalled();
  });
});

describe('saveTeam', () => {
    it('should return a function to dispatch the action', () => {
        expect(typeof actions.saveTeam()).toBe('function');
    });

    it('should save to storage and dispatch an action to add team', async () => {
        const dispatchMock = jest.fn();
        const getStateMock = mockGetState([], undefined, { signedIn: true, userId: TEST_USER_ID });

        actions.saveTeam(getNewTeam())(dispatchMock, getStateMock, undefined);

        // Waits for promises to resolve.
        await Promise.resolve();

        // Checks that the new team was saved to the database.
        const query: Query = mockFirebase.firestore().collection(KEY_TEAMS).where('name', '==', newTeamSaved.name);
        const result: QuerySnapshot = await query.get();
        expect(result.size).toEqual(1);

        const expectedData: any = {
          ...getNewTeamData(),
          owner_uid: TEST_USER_ID
        };

        let id = '';
        let data: DocumentData = {};
        result.forEach((doc: QueryDocumentSnapshot) => {
          id = doc.id;
          data = doc.data();
        });

        expect(id).toBeTruthy();
        expect(id).toMatch(/[A-Za-z0-9]+/);
        expect(data).toEqual(expectedData);

        // Waits for promises to resolve.
        await Promise.resolve();
        expect(dispatchMock).toBeCalledWith(expect.any(Function));
    });

    it('should not dispatch an action when storage access fails', async () => {
        const dispatchMock = jest.fn();
        const getStateMock = jest.fn();
        firebaseRef.firestore.mockImplementationOnce(() => { throw new Error('Storage failed with some error'); });

        expect(() => {
          actions.saveTeam(getNewTeam())(dispatchMock, getStateMock, undefined);
        }).toThrow();

        // Waits for promises to resolve.
        await Promise.resolve();

        expect(dispatchMock).not.toBeCalled();
    });
});

describe('addTeam', () => {
  it('should return a function to dispatch the addTeam action', () => {
    expect(typeof actions.addTeam()).toBe('function');
  });

  it('should dispatch an action to add the team', () => {
    const dispatchMock = jest.fn();
    const getStateMock = jest.fn();

    actions.addTeam(newTeamSaved)(dispatchMock, getStateMock, undefined);

    expect(dispatchMock).toBeCalledWith(expect.objectContaining({
      type: actions.ADD_TEAM,
      team: newTeamSaved,
    }));
  });

});

describe('getRoster', () => {
  it('should return a function to dispatch the getRoster action', () => {
    expect( typeof actions.getRoster() ).toBe('function');
  });

    it('should do nothing if team id is missing', () => {
      const dispatchMock = jest.fn();
      const getStateMock = jest.fn();

      actions.getRoster()(dispatchMock, getStateMock, undefined);

      expect(firebaseRef.firestore).not.toHaveBeenCalled();

      expect(dispatchMock).not.toBeCalled();
    });

  it('should dispatch an action with the roster returned from storage', async () => {
    const dispatchMock = jest.fn();
    const getStateMock = jest.fn();

    const rosterData = buildRoster([getStoredPlayer()]);

    actions.getRoster(getStoredTeam().id)(dispatchMock, getStateMock, undefined);

    // Waits for promises to resolve.
    await Promise.resolve();

    expect(dispatchMock).toBeCalledWith(expect.objectContaining({
      type: actions.GET_ROSTER,
      roster: rosterData,
    }));
  });

    it('should not dispatch an action when storage access fails', async () => {
      const dispatchMock = jest.fn();
      const getStateMock = jest.fn();

      firebaseRef.firestore.mockImplementationOnce(() => { throw new Error('Storage failed with some error'); });

      expect(() => {
        actions.getRoster(getStoredTeam().id)(dispatchMock, getStateMock, undefined);
      }).toThrow();

      // Waits for promises to resolve.
      await Promise.resolve();

      expect(dispatchMock).not.toBeCalled();
    });

}); // describe('getRoster')

describe('addNewPlayer', () => {
  it('should return a function to dispatch the action', () => {
    expect(typeof actions.addNewPlayer()).toBe('function');
  });

  it('should do nothing if new player is missing', () => {
    const dispatchMock = jest.fn();
    const getStateMock = jest.fn();

    actions.addNewPlayer()(dispatchMock, getStateMock, undefined);

    expect(getStateMock).not.toBeCalled();

    expect(dispatchMock).not.toBeCalled();
  });

  it('should dispatch an action to add a new player that is unique', () => {
    const dispatchMock = jest.fn();
    const getStateMock = mockGetState([], undefined, undefined, [getStoredPlayer()]);

    actions.addNewPlayer(getNewPlayer())(dispatchMock, getStateMock, undefined);

    expect(getStateMock).toBeCalled();

    expect(dispatchMock).toBeCalledWith(expect.any(Function));
  });

  it('should do nothing with a new player that is not unique', () => {
    const dispatchMock = jest.fn();
    const getStateMock = mockGetState([], undefined, undefined, [getNewPlayer()]);

    actions.addNewPlayer(getNewPlayer())(dispatchMock, getStateMock, undefined);

    expect(getStateMock).toBeCalled();

    expect(dispatchMock).not.toBeCalled();
  });
});

  describe('savePlayer', () => {
    it('should return a function to dispatch the action', () => {
      expect(typeof actions.savePlayer()).toBe('function');
    });


    it('should save to storage and dispatch an action to add player', async () => {
      const dispatchMock = jest.fn();

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
      expect(result.size).toEqual(1);

      const expectedData: any = {
        ...getNewPlayerData(),
        owner_uid: TEST_USER_ID
      };

      let id = '';
      let data: DocumentData = {};
      result.forEach((doc: QueryDocumentSnapshot) => {
        id = doc.id;
        data = doc.data();
      });

      expect(id).toBeTruthy();
      expect(id).toMatch(/[A-Za-z0-9]+/);
      expect(data).toEqual(expectedData);

      // Waits for promises to resolve.
      await Promise.resolve();
      expect(dispatchMock).toBeCalledWith(expect.any(Function));
    });

    it('should not dispatch an action when storage access fails', async () => {
      const dispatchMock = jest.fn();
      const getStateMock = jest.fn();
      firebaseRef.firestore.mockImplementationOnce(() => { throw new Error('Storage failed with some error'); });

      expect(() => {
        actions.savePlayer(getNewPlayer())(dispatchMock, getStateMock, undefined);
      }).toThrow();

      // Waits for promises to resolve.
      await Promise.resolve();

      expect(dispatchMock).not.toBeCalled();
    });
  }); // describe('savePlayer')

  describe('addPlayer', () => {
    it('should return a function to dispatch the addPlayer action', () => {
      expect(typeof actions.addPlayer()).toBe('function');
    });

    it('should dispatch an action to add the player', () => {
      const dispatchMock = jest.fn();
      const getStateMock = jest.fn();

      actions.addPlayer(getNewPlayer())(dispatchMock, getStateMock, undefined);

      expect(dispatchMock).toBeCalledWith(expect.objectContaining({
        type: actions.ADD_PLAYER,
        player: getNewPlayer(),
      }));
    });

  }); // describe('addPlayer')

}); // describe('Team actions')
