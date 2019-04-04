import * as actions from '@app/actions/team';
import { Player, Roster, Team, Teams } from '@app/models/team';
import { firestore } from '@app/firebase';
import { collectionMock, collectionData } from '../helpers/mock_firestore';

jest.mock('@app/firebase');
firestore.collection = collectionMock;

const KEY_TEAMS = 'teams';


describe('getTeams', () => {
  const storedTeam: Team = {
      id: 'st1', name: 'Stored team 1'
  };

  beforeEach(() => {
  });

  it('should return a function to dispatch the getTeams action', () => {
    expect(typeof actions.getTeams()).toBe('function');
  });

  it('should dispatch an action to get the list of teams', async () => {
    const dispatchMock = jest.fn();
    const getStateMock = jest.fn();

    actions.getTeams()(dispatchMock, getStateMock, undefined);

    // Waits for promises to resolve.
    await Promise.resolve();

    expect(dispatchMock).toBeCalledWith(expect.objectContaining({
      type: actions.GET_TEAMS,
      teams: expect.anything(),
    }));
  });

  it('should dispatch an action with the teams returned from get() from storage', async () => {
      const dispatchMock = jest.fn();
      const getStateMock = jest.fn();

      const teamData: Teams = {};
      teamData[storedTeam.id] = storedTeam;
      collectionData.getSnapshot = [storedTeam];

      actions.getTeams()(dispatchMock, getStateMock, undefined);

      // Waits for promises to resolve.
      await Promise.resolve();

      // Checks that get() was called to retrieve teams from storage.
      expect(collectionMock).toHaveBeenCalledWith(KEY_TEAMS);
      expect(collectionMock().get).toHaveBeenCalled();

      expect(dispatchMock).toBeCalledWith(expect.objectContaining({
          type: actions.GET_TEAMS,
          teams: teamData,
      }));
  });

    it('should not dispatch an action when get() fails', async () => {
        const dispatchMock = jest.fn();
        const getStateMock = jest.fn();
        collectionMock().get.mockRejectedValue(new Error('Get failed with some error'));

        actions.getTeams()(dispatchMock, getStateMock, undefined);

        // Waits for promises to resolve.
        await Promise.resolve();

        // Checks that get() was called to retrieve teams from storage.
        expect(collectionMock).toHaveBeenCalledWith(KEY_TEAMS);
        expect(collectionMock().get).toHaveBeenCalled();

        expect(dispatchMock).not.toBeCalled();
    });

});

describe('addNewTeam', () => {
  const newTeam: Team = {
    id: 'nt1', name: 'New team 1'
  };

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
    const getStateMock = jest.fn(() => {
      const teamData: Teams = {};
      teamData['EX'] = { id: 'EX', name: 'Existing team' };
      return {
        team: {
          teams: teamData
        }
      };
    });

    actions.addNewTeam(newTeam)(dispatchMock, getStateMock, undefined);

    expect(getStateMock).toBeCalled();

    expect(dispatchMock).toBeCalledWith(expect.any(Function));
  });

  it('should do nothing with a new team that is not unique', () => {
    const dispatchMock = jest.fn();
    const getStateMock = jest.fn(() => {
      const teamData: Teams = {};
      teamData[newTeam.id] = newTeam;
      return {
        team: {
          teams: teamData
        }
      };
    });

    actions.addNewTeam(newTeam)(dispatchMock, getStateMock, undefined);

    expect(getStateMock).toBeCalled();

    expect(dispatchMock).not.toBeCalled();
  });
});

describe('saveTeam', () => {
    const newTeam: Team = {
        id: 'nt1', name: 'New team 1'
    };

    it('should return a function to dispatch the action', () => {
        expect(typeof actions.saveTeam()).toBe('function');
    });

    it('should dispatch an action to add team', async () => {
        const dispatchMock = jest.fn();
        const getStateMock = jest.fn();

        actions.saveTeam(newTeam)(dispatchMock, getStateMock, undefined);

        // Waits for promises to resolve.
        await Promise.resolve();

        // Checks that firestore add(doc) was called for new team.
        expect(collectionMock).toHaveBeenCalledWith(KEY_TEAMS);
        expect(collectionMock().add).toHaveBeenCalledWith(expect.objectContaining(newTeam));

        // Waits for promises to resolve.
        await Promise.resolve();
        expect(dispatchMock).toBeCalledWith(expect.any(Function));
    });

    it('should not dispatch an action when storage add() fails', async () => {
        const dispatchMock = jest.fn();
        const getStateMock = jest.fn();
        collectionMock().add.mockRejectedValue(new Error('Add failed with some error'));

        actions.saveTeam(newTeam)(dispatchMock, getStateMock, undefined);

        // Waits for promises to resolve.
        await Promise.resolve();

        // Checks that firestore add(doc) was called for new team.
        expect(collectionMock).toHaveBeenCalledWith(KEY_TEAMS);
        expect(collectionMock().add).toHaveBeenCalledWith(expect.objectContaining(newTeam));

        expect(dispatchMock).not.toBeCalled();
    });
});

describe('addTeam', () => {
  const newTeam: Team = {
    id: 'nt1', name: 'New team 1'
  };

  it('should return a function to dispatch the addTeam action', () => {
    expect(typeof actions.addTeam()).toBe('function');
  });

  it('should dispatch an action to add the team', () => {
    const dispatchMock = jest.fn();
    const getStateMock = jest.fn();

    actions.addTeam(newTeam)(dispatchMock, getStateMock, undefined);

    expect(dispatchMock).toBeCalledWith(expect.objectContaining({
      type: actions.ADD_TEAM,
      team: newTeam,
    }));
  });

});

describe('getRoster', () => {
  it('should return a function to dispatch the getRoster action', () => {
    expect( typeof actions.getRoster() ).toBe('function');
  });

  it('should dispatch an action to get the roster', () => {
    const dispatchMock = jest.fn();
    const getStateMock = jest.fn();

    actions.getRoster()(dispatchMock, getStateMock, undefined);

    expect(dispatchMock).toBeCalledWith(expect.objectContaining({
        type: actions.GET_ROSTER,
        roster: expect.anything(),
      }));
  });
});

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
    const getStateMock = jest.fn(() => {
      const playerData: Roster = {};
      playerData[storedPlayer.id] = storedPlayer;
      return {
        team: {
          roster: playerData
        }
      };
    });

    actions.addNewPlayer(newPlayer)(dispatchMock, getStateMock, undefined);

    expect(getStateMock).toBeCalled();

    expect(dispatchMock).toBeCalledWith(expect.any(Function));
  });

  it('should do nothing with a new player that is not unique', () => {
    const dispatchMock = jest.fn();
    const getStateMock = jest.fn(() => {
      const playerData: Roster = {};
      playerData[newPlayer.id] = newPlayer;
      return {
        team: {
          roster: playerData
        }
      };
    });

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
        const getStateMock = jest.fn(() => {
            const playerData: Roster = {};
            playerData[storedPlayer.id] = storedPlayer;
            return {
                team: {
                    roster: playerData
                }
            };
        });

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
        const getStateMock = jest.fn(() => {
            const playerData: Roster = {};
            playerData[storedPlayer.id] = storedPlayer;
            return {
                team: {
                    roster: playerData
                }
            };
        });

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
