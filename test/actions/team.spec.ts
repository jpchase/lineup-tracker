import * as actions from '@app/actions/team';

describe('getRoster', () => {
  it('should return a function to dispatch an action', () => {
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
