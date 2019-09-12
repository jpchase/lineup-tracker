
/**
@license
*/

import { Action, ActionCreator } from 'redux';
import { ThunkAction } from 'redux-thunk';
import { RootState } from '../store';
import { User } from '../models/auth';
import { User as FirebaseUser } from '@firebase/auth-types';
import { authRef, provider } from "../firebase";

import { GET_USER_SUCCESS } from "../slices/auth-types";

export interface AuthActionGetUser extends Action<typeof GET_USER_SUCCESS> { user: User };
export type AuthAction = AuthActionGetUser;

type ThunkResult = ThunkAction<void, RootState, undefined, AuthAction>;
type ThunkPromise<R> = ThunkAction<Promise<R>, RootState, undefined, AuthAction>;

export const getUser: ActionCreator<ThunkPromise<boolean>> = () => (dispatch) => {
  // Return a promise that resolves once the auth state is known, via callback.
  let resolveFunc: Function;
  const changedPromise = new Promise<boolean>((resolve) => {
    resolveFunc = resolve;
  });

    authRef.onAuthStateChanged((user: FirebaseUser | null) => {
        if (user) {
          console.log(`onAuthStateChanged: id = ${user.uid}, name = ${user.displayName}`);
            dispatch({
                type: GET_USER_SUCCESS,
                user: getUserFromFirebaseUser(user)
            });
          resolveFunc(true);
        } else {
          console.log(`onAuthStateChanged: user = ${user}`);
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
    authRef
        .signInWithPopup(provider)
        .then(result => {
          console.log(`Sign in succeeded: ${result.user ? result.user.uid : null}`);
        })
        .catch(error => {
            console.error(`Error trying to sign in: ${error}`);
        });
};

function getUserFromFirebaseUser(firebaseUser: FirebaseUser): User {
    return {
        id: firebaseUser.uid,
        name: firebaseUser.displayName!,
        email: firebaseUser.email || '',
        imageUrl: firebaseUser.photoURL || ''
    };
}
