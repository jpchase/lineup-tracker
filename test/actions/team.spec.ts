import * as actions from '@app/actions/team';
import { Team, Teams } from '@app/models/team';
import { get, set } from 'idb-keyval';

jest.mock('idb-keyval');
const mockedGet = <jest.Mock<typeof get>>get;
const mockedSet = <jest.Mock<typeof set>>set;

const KEY_TEAMS = 'teams';

describe('getTeams', () => {
  const storedTeam: Team = {
      id: 'st1', name: 'Stored team 1'
  };

  beforeEach(() => {
      mockedGet.mockReset();
  });

  it('should return a function to dispatch the getTeams action', () => {
    expect(typeof actions.getTeams()).toBe('function');
  });

  it('should dispatch an action to get the list of teams', async () => {
    const dispatchMock = jest.fn();
    const getStateMock = jest.fn();
    mockedGet.mockResolvedValue(undefined);

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
      mockedGet.mockResolvedValue(teamData);

      actions.getTeams()(dispatchMock, getStateMock, undefined);

      // Waits for promises to resolve.
      await Promise.resolve();

      // Checks that get() was called to retrieve teams from storage.
      expect(mockedGet.mock.calls.length).toBe(1);
      expect(mockedGet.mock.calls[0][0]).toBe(KEY_TEAMS);

      expect(dispatchMock).toBeCalledWith(expect.objectContaining({
          type: actions.GET_TEAMS,
          teams: teamData,
      }));
  });

    it('should not dispatch an action when get() fails', async () => {
        const dispatchMock = jest.fn();
        const getStateMock = jest.fn();
        mockedGet.mockRejectedValue(new Error('Some error'));

        actions.getTeams()(dispatchMock, getStateMock, undefined);

        // Waits for promises to resolve.
        await Promise.resolve();

        // Checks that get() was called.
        expect(mockedGet.mock.calls.length).toBe(1);
        expect(mockedGet.mock.calls[0][0]).toBe(KEY_TEAMS);

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
    const storedTeam: Team = {
        id: 'st1', name: 'Stored team 1'
    };
    const newTeam: Team = {
        id: 'nt1', name: 'New team 1'
    };

    beforeEach(() => {
        mockedSet.mockReset();
    });


    it('should return a function to dispatch the action', () => {
        expect(typeof actions.saveTeam()).toBe('function');
    });

    it('should dispatch an action to add team', async () => {
        const dispatchMock = jest.fn();
        const getStateMock = jest.fn(() => {
            const teamData: Teams = {};
            teamData[storedTeam.id] = storedTeam;
            return {
                team: {
                    teams: teamData
                }
            };
        });
        // Set any resolved value, so that set() promise will actually resolve.
        mockedSet.mockResolvedValue({});

        actions.saveTeam(newTeam)(dispatchMock, getStateMock, undefined);

        // Waits for promises to resolve.
        await Promise.resolve();

        expect(getStateMock).toBeCalled();

        // Checks that set() was called to save teams to storage.
        const expectedTeamData: Teams = {} as Teams;
        expectedTeamData[storedTeam.id] = storedTeam;
        expectedTeamData[newTeam.id] = newTeam;

        expect(mockedSet.mock.calls.length).toBe(1);
        expect(mockedSet.mock.calls[0][0]).toBe(KEY_TEAMS);
        expect(mockedSet.mock.calls[0][1]).toEqual(expectedTeamData);

        expect(dispatchMock).toBeCalledWith(expect.any(Function));
    });

    it('should not dispatch an action when set() fails', async () => {
        const dispatchMock = jest.fn();
        const getStateMock = jest.fn(() => {
            const teamData: Teams = {};
            teamData[storedTeam.id] = storedTeam;
            return {
                team: {
                    teams: teamData
                }
            };
        });
        mockedSet.mockRejectedValue(new Error('Some error'));

        actions.saveTeam(newTeam)(dispatchMock, getStateMock, undefined);

        // Waits for promises to resolve.
        await Promise.resolve();

        expect(getStateMock).toBeCalled();

        // Checks that set() was called.
        expect(mockedSet.mock.calls.length).toBe(1);
        expect(mockedSet.mock.calls[0][0]).toBe(KEY_TEAMS);

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
