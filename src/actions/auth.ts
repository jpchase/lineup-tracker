
/**
@license
*/

import { GoogleAuthProvider, signInWithCredential, User as FirebaseUser, UserCredential } from 'firebase/auth';
import { ActionCreator, AnyAction } from 'redux';
import { ThunkAction } from 'redux-thunk';
import { getEnv } from '../app/environment.js';
import { debug } from '../common/debug';
import { auth, firebaseRefs } from '../firebase';
import { User } from '../models/auth';
import { getUserSuccess } from '../slices/auth/auth-slice.js';
import { RootState } from '../store';

type ThunkResult = ThunkAction<void, RootState, undefined, AnyAction>;
type ThunkPromise<R> = ThunkAction<Promise<R>, RootState, undefined, AnyAction>;

const env = getEnv();
const debugAuth = debug('auth');

export const getUser: ActionCreator<ThunkPromise<boolean>> = () => (dispatch) => {
  // Return a promise that resolves once the auth state is known, via callback.
  let resolveFunc: Function;
  const changedPromise = new Promise<boolean>((resolve) => {
    resolveFunc = resolve;
  });

  auth.onAuthStateChanged(firebaseRefs.auth, (user: FirebaseUser | null) => {
    if (user) {
      debugAuth(`onAuthStateChanged: id = ${user.uid}, name = ${user.displayName}`);
      dispatch(getUserSuccess(getUserFromFirebaseUser(user)));
      resolveFunc(true);
    } else {
      debugAuth(`onAuthStateChanged: user = ${user}`);
      dispatch(getUserSuccess({} as User));
      resolveFunc(false);
    }
  });

  return changedPromise;
};

export const signIn: ActionCreator<ThunkResult> = () => () => {
  let signinPromise: Promise<UserCredential>;

  if (env.firebase.useEmulators) {
    debugAuth('Sign in with test credential');
    //TODO: Get this from env.config instead (or some kind of plugin?)
    const defaultCredentialToken = `{"sub": "3FK9P5Ledx4voK8w5Ep07DS6dCUc", "email": "algae.orange.312@test.com", "email_verified": true}`;
    let credentialToken = defaultCredentialToken;

    const urlParams = new URLSearchParams(location.search);
    const testUserId = urlParams.get('user');

    if (testUserId && testUserId === 'dkRjNwwKIkB6OVQH2SRkBpmYHo8A') {
      credentialToken = `{"sub": "dkRjNwwKIkB6OVQH2SRkBpmYHo8A", "email": "grass.panda.936@test.com", "email_verified": true}`;
    }

    const credential = GoogleAuthProvider.credential(credentialToken);
    signinPromise = signInWithCredential(firebaseRefs.auth, credential);
  } else {
    debugAuth('Sign in with popup, as usual');
    signinPromise = auth.signInWithPopup(firebaseRefs.auth, auth.provider);
  }
  signinPromise
    .then((result: UserCredential) => {
      debugAuth(`Sign in succeeded: ${result.user ? result.user.uid : null}`);
    })
    .catch(error => {
      console.error(`Error trying to sign in: ${error}`);
    })
    .finally(() => { console.log('got to the finally clause') });
};

function getUserFromFirebaseUser(firebaseUser: FirebaseUser): User {
  return {
    id: firebaseUser.uid,
    name: firebaseUser.displayName!,
    email: firebaseUser.email || '',
    imageUrl: firebaseUser.photoURL || ''
  };
}
