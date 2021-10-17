
/**
@license
*/

import { User as FirebaseUser, UserCredential } from '@firebase/auth';
import { GoogleAuthProvider, onAuthStateChanged, signInWithCredential } from 'firebase/auth';
import { Action, ActionCreator } from 'redux';
import { ThunkAction } from 'redux-thunk';
import { debug } from '../common/debug';
import { auth, authRef, provider } from '../firebase';
import { useTestData } from '../init';
import { User } from '../models/auth';
import { GET_USER_SUCCESS } from '../slices/auth-types';
import { RootState } from '../store';

export interface AuthActionGetUser extends Action<typeof GET_USER_SUCCESS> { user: User };
export type AuthAction = AuthActionGetUser;

type ThunkResult = ThunkAction<void, RootState, undefined, AuthAction>;
type ThunkPromise<R> = ThunkAction<Promise<R>, RootState, undefined, AuthAction>;

const debugAuth = debug('auth');

export const getUser: ActionCreator<ThunkPromise<boolean>> = () => (dispatch) => {
  // Return a promise that resolves once the auth state is known, via callback.
  let resolveFunc: Function;
  const changedPromise = new Promise<boolean>((resolve) => {
    resolveFunc = resolve;
  });

  onAuthStateChanged(authRef, (user: FirebaseUser | null) => {
    if (user) {
      debugAuth(`onAuthStateChanged: id = ${user.uid}, name = ${user.displayName}`);
      dispatch({
        type: GET_USER_SUCCESS,
        user: getUserFromFirebaseUser(user)
      });
      resolveFunc(true);
    } else {
      debugAuth(`onAuthStateChanged: user = ${user}`);
      dispatch({
        type: GET_USER_SUCCESS,
        user: {} as User
      });
      resolveFunc(false);
    }
  });

  return changedPromise;
};

export const signIn: ActionCreator<ThunkResult> = () => () => {
  let signinPromise: Promise<UserCredential>;

  if (useTestData()) {
    debugAuth('Sign in with test credential')
    const credential = GoogleAuthProvider.credential(
      `{"sub": "3FK9P5Ledx4voK8w5Ep07DS6dCUc", "email": "algae.orange.312@test.com", "email_verified": true}`
    )
    signinPromise = signInWithCredential(authRef, credential);
  } else {
    debugAuth('Sign in with popup, as usual');
    signinPromise = auth.signInWithPopup(authRef, provider);
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
