
/**
@license
*/

import { Action, ActionCreator } from 'redux';
import { ThunkAction } from 'redux-thunk';
import { RootState } from '../store.js';
import { User } from '../models/auth.js';
import { User as FirebaseUser } from '@firebase/auth-types';
import { authRef, provider } from "../firebase";

export const GET_USER = 'GET_USER';

export interface AuthActionGetUser extends Action<'GET_USER'> { user: User };
export type AuthAction = AuthActionGetUser;

type ThunkResult = ThunkAction<void, RootState, undefined, AuthAction>;

export const getUser: ActionCreator<ThunkResult> = () => (dispatch) => {
    authRef.onAuthStateChanged((user: FirebaseUser | null) => {
        if (user) {
          console.log(`onAuthStateChanged: id = ${user.uid}, name = ${user.displayName}`);
            dispatch({
                type: GET_USER,
                user: getUserFromFirebaseUser(user)
            });
        } else {
          console.log(`onAuthStateChanged: user = ${user}`);
          dispatch({
                type: GET_USER,
                user: {} as User
            });
        }
    });
};

export const signIn: ActionCreator<ThunkResult> = () => () => {
    authRef
        .signInWithPopup(provider)
        .then((/* result */) => { })
        .catch(error => {
            console.log(error);
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
