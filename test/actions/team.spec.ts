import * as actions from '@app/actions/team';

describe('getTeams', () => {
  it('should return a function to dispatch the getTeams action', () => {
    expect(typeof actions.getTeams()).toBe('function');
  });

  it('should dispatch an action to get the list of teams', () => {
    const dispatchMock = jest.fn();
    const getStateMock = jest.fn();

    actions.getTeams()(dispatchMock, getStateMock, undefined);

    expect(dispatchMock).toBeCalledWith(expect.objectContaining({
      type: actions.GET_TEAMS,
      teams: expect.anything(),
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
