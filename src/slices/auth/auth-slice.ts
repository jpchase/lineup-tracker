/** @format */

import { createSelector, createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  GoogleAuthProvider,
  signInWithCredential,
  User as FirebaseUser,
  UserCredential,
} from 'firebase/auth';
import { getEnv } from '../../app/environment.js';
import { debug } from '../../common/debug.js';
import { auth as authApi, firebaseRefs } from '../../firebase.js';
import { User } from '../../models/auth.js';
import { RootState, ThunkPromise, ThunkResult } from '../../store.js';

export interface AuthState {
  user?: User;
  error: string;
}

const INITIAL_STATE: AuthState = {
  user: undefined,
  error: '',
};

const env = getEnv();
const debugAuth = debug('auth');

export const getUser = (): ThunkPromise<boolean> => (dispatch) => {
  // Return a promise that resolves once the auth state is known, via callback.
  let resolveFunc: Function;
  const changedPromise = new Promise<boolean>((resolve) => {
    resolveFunc = resolve;
  });

  authApi.onAuthStateChanged(firebaseRefs.auth, (user: FirebaseUser | null) => {
    if (user) {
      debugAuth(`onAuthStateChanged: id = ${user.uid}, name = ${user.displayName}`);
      dispatch(authSlice.actions.userSignedIn(getUserFromFirebaseUser(user)));
      resolveFunc(true);
    } else {
      debugAuth(`onAuthStateChanged: user = ${user}`);
      dispatch(authSlice.actions.userSignedOut());
      resolveFunc(false);
    }
  });

  return changedPromise;
};

export const signIn = (): ThunkResult => () => {
  let signinPromise: Promise<UserCredential>;

  if (env.firebase.useEmulators) {
    debugAuth('Sign in with test credential');
    //TODO: Get this from env.config instead (or some kind of plugin?)
    const defaultCredentialToken = `{"sub": "3FK9P5Ledx4voK8w5Ep07DS6dCUc", "email": "algae.orange.312@test.com", "email_verified": true}`;
    let credentialToken = defaultCredentialToken;

    // eslint-disable-next-line no-restricted-globals
    const urlParams = new URLSearchParams(location.search);
    const testUserId = urlParams.get('user');

    if (testUserId && testUserId === 'dkRjNwwKIkB6OVQH2SRkBpmYHo8A') {
      credentialToken = `{"sub": "dkRjNwwKIkB6OVQH2SRkBpmYHo8A", "email": "grass.panda.936@test.com", "email_verified": true}`;
    }

    const credential = GoogleAuthProvider.credential(credentialToken);
    signinPromise = signInWithCredential(firebaseRefs.auth, credential);
  } else {
    debugAuth('Sign in with popup, as usual');
    signinPromise = authApi.signInWithPopup(firebaseRefs.auth, authApi.provider);
  }
  signinPromise
    .then((result: UserCredential) => {
      debugAuth(`Sign in succeeded: ${result.user ? result.user.uid : null}`);
    })
    .catch((error) => {
      console.error(`Error trying to sign in: ${error}`);
    })
    .finally(() => {
      debugAuth('got to the finally clause for sign in');
    });
};

export const authSlice = createSlice({
  name: 'auth',
  initialState: INITIAL_STATE,
  reducers: {
    userSignedIn: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.error = '';
    },
    userSignedOut: (state) => {
      state.user = undefined;
      state.error = '';
    },
  },
});

export const { actions } = authSlice;

export const selectCurrentUser = (state: RootState) => state.auth?.user;

export const selectCurrentUserId = createSelector(selectCurrentUser, (user) => {
  if (!user) {
    return undefined;
  }
  return user.id;
});

function getUserFromFirebaseUser(firebaseUser: FirebaseUser): User {
  return {
    id: firebaseUser.uid,
    name: firebaseUser.displayName!,
    email: firebaseUser.email || '',
    imageUrl: firebaseUser.photoURL || '',
  };
}
