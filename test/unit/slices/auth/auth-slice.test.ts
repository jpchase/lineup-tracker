/** @format */

import { auth } from '@app/app/firebase.js';
import { User } from '@app/models/auth.js';
import { actions, getUser, signIn } from '@app/slices/auth/auth-slice.js';
import { expect } from '@open-wc/testing';
import {
  User as FirebaseUser,
  OperationType,
  UserCredential,
  onAuthStateChanged,
} from 'firebase/auth';
import sinon from 'sinon';

const { userSignedIn, userSignedOut } = actions;

type AuthStateChangedFn = typeof onAuthStateChanged;

function buildFirebaseUser(uid: number): FirebaseUser {
  const result: any = {
    uid,
    displayName: `User ${uid}`,
  };
  return result as FirebaseUser;
}

function buildUserCredential(user: FirebaseUser): UserCredential {
  return {
    user,
    providerId: null,
    operationType: OperationType.SIGN_IN,
  };
}

function mockAuthStateChanged(changedValue: FirebaseUser | null): AuthStateChangedFn {
  return (_auth, nextOrObserver) => {
    if (typeof nextOrObserver === 'function') {
      nextOrObserver(changedValue);
    }
    return () => {};
  };
}

describe('getUser', () => {
  let changedStub: sinon.SinonStub;

  beforeEach(() => {
    changedStub = sinon.stub(auth, 'onAuthStateChanged');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should return a function to dispatch the getUser action', () => {
    expect(getUser()).to.be.instanceof(Function);
  });

  it('should dispatch an action to get user after sign in', () => {
    const dispatchMock = sinon.stub();
    const getStateMock = sinon.stub();

    const firebaseUser = {
      uid: 'su1',
      displayName: 'Signed in user 1',
      email: null,
      photoURL: null,
    } as FirebaseUser;

    changedStub.onFirstCall().callsFake(mockAuthStateChanged(firebaseUser));

    getUser()(dispatchMock, getStateMock, undefined);

    // Checks that onAuthStateChanged() was called with a callback.
    expect(changedStub).to.have.callCount(1);
    expect(changedStub.firstCall).to.have.been.calledWith(sinon.match.object, sinon.match.func);

    const signedInUser: User = {
      id: 'su1',
      name: 'Signed in user 1',
      email: '',
      imageUrl: '',
    };

    expect(dispatchMock).to.have.been.calledWith(userSignedIn(signedInUser));
  });

  it('should dispatch an action with no user after sign out', () => {
    const dispatchMock = sinon.stub();
    const getStateMock = sinon.stub();

    changedStub.onFirstCall().callsFake(mockAuthStateChanged(null));

    getUser()(dispatchMock, getStateMock, undefined);

    // Checks that onAuthStateChanged() was called with a callback.
    expect(changedStub).to.have.callCount(1);

    expect(dispatchMock).to.have.been.calledWith(userSignedOut());
  });
});

describe('signIn', () => {
  let signInSpy: sinon.SinonStub;

  beforeEach(() => {
    signInSpy = sinon.stub(auth, 'signInWithPopup');
    sinon.stub(console, 'log');
    sinon.stub(console, 'error');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should return a function to do the sign in', () => {
    expect(signIn()).to.be.instanceof(Function);
  });

  it('should call the Firebase sign in method and log success', () => {
    const dispatchMock = sinon.stub();
    const getStateMock = sinon.stub();

    const result: UserCredential = buildUserCredential(buildFirebaseUser(1234));
    signInSpy.onFirstCall().resolves(result);

    signIn()(dispatchMock, getStateMock, undefined);

    // Checks that signInWithPopup() was called.
    expect(signInSpy).to.have.callCount(1);
  });

  it('should call the Firebase sign in method and handle error', async () => {
    const dispatchMock = sinon.stub();
    const getStateMock = sinon.stub();

    signInSpy.onFirstCall().rejects(new Error('Some error'));

    signIn()(dispatchMock, getStateMock, undefined);

    // Checks that signInWithPopup() was called.
    expect(signInSpy).to.have.callCount(1);
  });
});
