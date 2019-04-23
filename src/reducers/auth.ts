/**
@license
*/

import { Reducer } from 'redux';
import { User } from '../models/auth.js';
import {
  GET_USER
} from '../actions/auth.js';
import { RootAction } from '../store.js';

export interface AuthState {
  user: User | undefined;
  error: string;
}

const INITIAL_STATE: AuthState = {
  user: undefined,
  error: ''
};

const auth: Reducer<AuthState, RootAction> = (state = INITIAL_STATE, action) => {
  switch (action.type) {
    case GET_USER:
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
