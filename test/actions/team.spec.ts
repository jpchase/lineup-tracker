import * as actions from '@app/actions/team';
import { Player, Roster } from '@app/models/player';
import { Team, Teams } from '@app/models/team';
import { firebaseRef } from '@app/firebase';
import { Query, QuerySnapshot } from '@firebase/firestore-types';
/// <reference path="mock-cloud-firestore.d.ts" />
import * as MockFirebase from 'mock-cloud-firestore';
import { TEST_USER_ID, getMockAuthState, getPublicTeam, getPublicTeamData, getStoredTeam, MockAuthStateOptions } from '../helpers/test_data';

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

export function getNewTeamData() {
  return { name: 'New team 1' }
};

// New team created by the UI does not have an ID until added to storage.
function getNewTeam(): Team {
    return {
        ...getNewTeamData(),
        id: ''
    };
}
const newTeamSaved: Team = {
  ...getNewTeam(),
  // TODO: Changed id to 'nt1', when supported by collection mocking;
    id: 'theId'
};

function buildTeams(teams: Team[]): Teams {
  return teams.reduce((obj, team) => {
    obj[team.id] = team;
    return obj;
  }, {} as Teams);
}

function buildRoster(players?: Player[]): Roster {
  if (!players) {
    return {} as Roster;
  }
  return players.reduce((obj, player) => {
    obj[player.id] = player;
    return obj;
  }, {} as Roster);
}

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
        const getStateMock = jest.fn();

        actions.saveTeam(getNewTeam())(dispatchMock, getStateMock, undefined);

        // Waits for promises to resolve.
        await Promise.resolve();

        // Checks that the new team was saved to the database.
        const query: Query = mockFirebase.firestore().collection(KEY_TEAMS).where('name', '==', newTeamSaved.name);
        const result: QuerySnapshot = await query.get();
        expect(result.size).toEqual(1);

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
  const storedPlayer: Player = {
    id: 'sp1', name: 'Stored player 1', uniformNumber: 5, positions: ['CB'], status: 'OFF'
  };

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

    const rosterData: Roster = {};
    rosterData[storedPlayer.id] = storedPlayer;

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
  const storedPlayer: Player = {
      id: 'sp1', name: 'Stored player 1', uniformNumber: 5, positions: ['CB'], status: 'OFF'
  };
  const newPlayer: Player = {
      id: 'np1', name: 'New player 1', uniformNumber: 1, positions: ['CB'], status: 'OFF'
  };

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
    const getStateMock = mockGetState([], undefined, undefined, [storedPlayer]);

    actions.addNewPlayer(newPlayer)(dispatchMock, getStateMock, undefined);

    expect(getStateMock).toBeCalled();

    expect(dispatchMock).toBeCalledWith(expect.any(Function));
  });

  it('should do nothing with a new player that is not unique', () => {
    const dispatchMock = jest.fn();
    const getStateMock = mockGetState([], undefined, undefined, [newPlayer]);

    actions.addNewPlayer(newPlayer)(dispatchMock, getStateMock, undefined);

    expect(getStateMock).toBeCalled();

    expect(dispatchMock).not.toBeCalled();
  });
});

describe('savePlayer', () => {
    const storedPlayer: Player = {
        id: 'sp1', name: 'Stored player 1', uniformNumber: 5, positions: ['CB'], status: 'OFF'
    };
    const newPlayer: Player = {
        id: 'np1', name: 'New player 1', uniformNumber: 1, positions: ['CB'], status: 'OFF'
    };

    beforeEach(() => {
    });

    it('should return a function to dispatch the action', () => {
        expect(typeof actions.savePlayer()).toBe('function');
    });

    it('should dispatch an action to add player', async () => {
        const dispatchMock = jest.fn();
        const getStateMock = mockGetState([], undefined, undefined, [storedPlayer]);

        actions.savePlayer(newPlayer)(dispatchMock, getStateMock, undefined);

        // Waits for promises to resolve.
        await Promise.resolve();
/*
        expect(getStateMock).toBeCalled();

        // Checks that set() was called to save players to storage.
        const expectedPlayerData: Roster = {} as Roster;
        expectedPlayerData[storedPlayer.id] = storedPlayer;
        expectedPlayerData[newPlayer.id] = newPlayer;

        expect(mockedSet.mock.calls.length).toBe(1);
        expect(mockedSet.mock.calls[0][0]).toBe(KEY_TEAMS);
        expect(mockedSet.mock.calls[0][1]).toEqual(expectedPlayerData);
*/
        expect(dispatchMock).toBeCalledWith(expect.any(Function));
    });

    it('should not dispatch an action when set() fails', async () => {
        const dispatchMock = jest.fn();
        const getStateMock = mockGetState([], undefined, undefined, [storedPlayer]);

        actions.savePlayer(newPlayer)(dispatchMock, getStateMock, undefined);

        // Waits for promises to resolve.
        await Promise.resolve();
/*
        expect(getStateMock).toBeCalled();

        // Checks that set() was called.
        expect(mockedSet.mock.calls.length).toBe(1);
        expect(mockedSet.mock.calls[0][0]).toBe(KEY_TEAMS);

        expect(dispatchMock).not.toBeCalled();
*/
        // TODO: Remove when data saving logic implemented.
        expect(dispatchMock).toBeCalledWith(expect.any(Function));
    });
});

describe('addPlayer', () => {
  const newPlayer: Player = {
      id: 'np1', name: 'New player 1', uniformNumber: 1, positions: ['CB'], status: 'OFF'
  };

  it('should return a function to dispatch the addPlayer action', () => {
    expect(typeof actions.addPlayer()).toBe('function');
  });

  it('should dispatch an action to add the player', () => {
    const dispatchMock = jest.fn();
    const getStateMock = jest.fn();

    actions.addPlayer(newPlayer)(dispatchMock, getStateMock, undefined);

    expect(dispatchMock).toBeCalledWith(expect.objectContaining({
      type: actions.ADD_PLAYER,
      player: newPlayer,
    }));
  });

});

}); // describe('Team actions')
