import * as actions from '@app/actions/auth';
import { User } from '@app/models/auth';
import { authRef /*, provider */ } from "@app/firebase";
import { User as FirebaseUser } from '@firebase/auth-types';
import { Observer, Unsubscribe } from '@firebase/util';

type AuthStateChangedFn = (
  nextOrObserver: Observer<any> | ((a: FirebaseUser | null) => any),
    error ?: (a: Error) => any,
    completed ?: Unsubscribe
  ) => Unsubscribe;

jest.mock('@app/firebase');

describe('getUser', () => {
  let changedSpy = jest.spyOn(authRef, 'onAuthStateChanged');

  afterEach(() => {
    changedSpy.mockRestore();
  });

  it('should return a function to dispatch the getUser action', () => {
    expect(typeof actions.getUser()).toBe('function');
  });

  it('should dispatch an action to get user after sign in', () => {
    const dispatchMock = jest.fn();
    const getStateMock = jest.fn();

    const firebaseUser = {
      uid: 'su1', displayName: 'Signed in user 1',
      email: null,
      photoURL: null
    } as FirebaseUser;

    jest.fn(() => true);

    const changedMock: AuthStateChangedFn = (nextOrObserver /*, error, completed*/): Unsubscribe => {
      if (typeof nextOrObserver === 'function') {
        nextOrObserver(firebaseUser);
      }
      return {} as Unsubscribe;
    };

    changedSpy.mockImplementation(changedMock);

    actions.getUser()(dispatchMock, getStateMock, undefined);

    // Checks that onAuthStateChanged() was called with a callback.
    expect(changedSpy.mock.calls.length).toBe(1);

    const signedInUser: User = {
      id: 'su1', name: 'Signed in user 1', email: '', imageUrl: ''
    };

    expect(dispatchMock).toBeCalledWith(expect.objectContaining({
      type: actions.GET_USER,
      user: signedInUser,
    }));
  });

});
