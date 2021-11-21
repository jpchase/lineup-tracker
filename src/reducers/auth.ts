/**
@license
*/

import { Reducer } from 'redux';
import { createSelector } from 'reselect';
import { User } from '../models/auth';
import {
  GET_USER_SUCCESS
} from '../slices/auth-types';
import { RootState } from '../store.js';

export interface AuthState {
  user: User | undefined;
  error: string;
}

const INITIAL_STATE: AuthState = {
  user: undefined,
  error: ''
};

const auth: Reducer<AuthState> = (state = INITIAL_STATE, action) => {
  switch (action.type) {
    case GET_USER_SUCCESS:
      console.log(`auth.ts - reducer: ${JSON.stringify(action)}, ${state}`);
      return {
        user: action.user,
        error: ''
      };

    default:
      return state;
  }
};

export default auth;

export const userSelector = (state: RootState) => state.auth && state.auth.user;

export const currentUserIdSelector = createSelector(
  userSelector,
  (user) => {
    if (!user) {
      return;
    }
    return user.id;
  }
);
