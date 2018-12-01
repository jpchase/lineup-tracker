import * as actions from '../../src/actions/team.js';

describe('getRoster', () => {
  it('should return a function to dispatch an action', () => {
    expect( typeof actions.getRoster() ).toBe('function');
  });

  it('should dispatch an action to get the roster', () => {
    const dispatchMock = jest.fn();

    actions.getRoster()(dispatchMock);

    expect(dispatchMock).toBeCalledWith(expect.objectContaining({
        type: actions.GET_ROSTER,
        roster: expect.anything(),
      }));
  });
});
