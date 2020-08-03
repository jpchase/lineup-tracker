import * as actions from '@app/actions/auth';
import { authRef /*, provider */ } from "@app/firebase";
import { User } from '@app/models/auth';
import * as actionTypes from '@app/slices/auth-types';
import { Error as FirebaseError, User as FirebaseUser, UserCredential } from '@firebase/auth-types';
import { Observer, Unsubscribe } from '@firebase/util';
import { expect } from '@open-wc/testing';
import * as sinon from 'sinon';

type AuthStateChangedFn = (
  nextOrObserver: Observer<any> | ((a: FirebaseUser | null) => any),
    error ?: (a: FirebaseError) => any,
    completed ?: Unsubscribe
  ) => Unsubscribe;

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
  let changedSpy: sinon.SinonStub;

  beforeEach(() => {
    changedSpy = sinon.stub(authRef, 'onAuthStateChanged');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should return a function to dispatch the getUser action', () => {
    expect(actions.getUser()).to.be.instanceof(Function);
  });

  it('should dispatch an action to get user after sign in', () => {
    const dispatchMock = sinon.stub();
    const getStateMock = sinon.stub();

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

    changedSpy.onFirstCall().callsFake(changedMock);

    actions.getUser()(dispatchMock, getStateMock, undefined);

    // Checks that onAuthStateChanged() was called with a callback.
    expect(changedSpy).to.have.callCount(1);
    expect(changedSpy.firstCall).to.have.been.calledWith(sinon.match.func);

    const signedInUser: User = {
      id: 'su1', name: 'Signed in user 1', email: '', imageUrl: ''
    };

    expect(dispatchMock).to.have.been.calledWith({
      type: actionTypes.GET_USER_SUCCESS,
      user: signedInUser,
    });
  });

  it('should dispatch an action with no user after sign out', () => {
    const dispatchMock = sinon.stub();
    const getStateMock = sinon.stub();

    const changedMock: AuthStateChangedFn = (nextOrObserver /*, error, completed*/): Unsubscribe => {
      if (typeof nextOrObserver === 'function') {
        nextOrObserver(null);
      }
      return {} as Unsubscribe;
    };

    changedSpy.onFirstCall().callsFake(changedMock);

    actions.getUser()(dispatchMock, getStateMock, undefined);

    // Checks that onAuthStateChanged() was called with a callback.
    expect(changedSpy).to.have.callCount(1);

    expect(dispatchMock).to.have.been.calledWith({
      type: actionTypes.GET_USER_SUCCESS,
      user: {},
    });
  });

});

describe('signIn', () => {
  let signInSpy: sinon.SinonStub;

  beforeEach(() => {
    signInSpy = sinon.stub(authRef, 'signInWithPopup');
    sinon.stub(console, 'log');
    sinon.stub(console, 'error');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should return a function to do the sign in', () => {
    expect(actions.signIn()).to.be.instanceof(Function);
  });

  it('should call the Firebase sign in method and log success', () => {
    const dispatchMock = sinon.stub();
    const getStateMock = sinon.stub();

    const result: UserCredential = buildUserCredential(buildFirebaseUser(1234));
    signInSpy.onFirstCall().resolves(result);

    actions.signIn()(dispatchMock, getStateMock, undefined);

    // Checks that signInWithPopup() was called.
    expect(signInSpy).to.have.callCount(1);
  });

  it('should call the Firebase sign in method and handle error', async () => {
    const dispatchMock = sinon.stub();
    const getStateMock = sinon.stub();

    signInSpy.onFirstCall().rejects(new Error('Some error'));

    actions.signIn()(dispatchMock, getStateMock, undefined);

    // Checks that signInWithPopup() was called.
    expect(signInSpy).to.have.callCount(1);
  });

});
