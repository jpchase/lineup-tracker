import * as actions from '@app/actions/auth';
import { User } from '@app/models/auth';
import { authRef /*, provider */ } from "@app/firebase";
import { Error as FirebaseError, User as FirebaseUser, UserCredential } from '@firebase/auth-types';
import { Observer, Unsubscribe } from '@firebase/util';

type AuthStateChangedFn = (
  nextOrObserver: Observer<any> | ((a: FirebaseUser | null) => any),
    error ?: (a: FirebaseError) => any,
    completed ?: Unsubscribe
  ) => Unsubscribe;

jest.mock('@app/firebase');

function buildFirebaseUser(uid: number): FirebaseUser {
  const result: any = {
    uid,
    displayName: `User ${uid}`
  }
  return result as FirebaseUser;
}

function buildUserCredential(user: FirebaseUser): UserCredential {
  return {
    credential: null,
    user
  }
}

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
    expect(typeof changedSpy.mock.calls[0][0]).toBe('function');

    const signedInUser: User = {
      id: 'su1', name: 'Signed in user 1', email: '', imageUrl: ''
    };

    expect(dispatchMock).toBeCalledWith(expect.objectContaining({
      type: actions.GET_USER,
      user: signedInUser,
    }));
  });

  it('should dispatch an action with no user after sign out', () => {
    const dispatchMock = jest.fn();
    const getStateMock = jest.fn();

    const changedMock: AuthStateChangedFn = (nextOrObserver /*, error, completed*/): Unsubscribe => {
      if (typeof nextOrObserver === 'function') {
        nextOrObserver(null);
      }
      return {} as Unsubscribe;
    };

    changedSpy.mockImplementation(changedMock);

    actions.getUser()(dispatchMock, getStateMock, undefined);

    // Checks that onAuthStateChanged() was called with a callback.
    expect(changedSpy.mock.calls.length).toBe(1);

    expect(dispatchMock).toBeCalledWith(expect.objectContaining({
      type: actions.GET_USER,
      user: {},
    }));
  });

});

describe('signIn', () => {
  const signInSpy = jest.spyOn(authRef, 'signInWithPopup');
  const logSpy = jest.spyOn(global.console, 'log');
  const errorSpy = jest.spyOn(global.console, 'error');

  afterEach(() => {
    signInSpy.mockRestore();
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('should return a function to do the sign in', () => {
    expect(typeof actions.signIn()).toBe('function');
  });

  it('should call the Firebase sign in method and log success', () => {
    const dispatchMock = jest.fn();
    const getStateMock = jest.fn();

    const result: UserCredential = buildUserCredential(buildFirebaseUser(1234));
    signInSpy.mockResolvedValue(Promise.resolve(result));

    actions.signIn()(dispatchMock, getStateMock, undefined);

    // Checks that signInWithPopup() was called.
    expect(signInSpy.mock.calls.length).toBe(1);
  });

  it('should call the Firebase sign in method and handle error', () => {
    const dispatchMock = jest.fn();
    const getStateMock = jest.fn();

    signInSpy.mockRejectedValue(new Error('Some error'));

    actions.signIn()(dispatchMock, getStateMock, undefined);

    // Checks that signInWithPopup() was called.
    expect(signInSpy.mock.calls.length).toBe(1);
  });

});
