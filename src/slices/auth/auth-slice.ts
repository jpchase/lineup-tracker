import { createSelector, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User } from '../../models/auth.js';
import { RootState } from '../../store.js';

export interface AuthState {
  user?: User;
  error: string;
}

const INITIAL_STATE: AuthState = {
  user: undefined,
  error: ''
};

const authSlice = createSlice({
  name: 'auth',
  initialState: INITIAL_STATE,
  reducers: {
    getUserSuccess: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.error = '';
    },
  },
});

const { actions, reducer } = authSlice;

export const { getUserSuccess } = actions;
export const auth = reducer;

export const selectCurrentUser = (state: RootState) => state.auth?.user;

export const selectCurrentUserId = createSelector(
  selectCurrentUser,
  (user) => {
    if (!user) {
      return;
    }
    return user.id;
  }
);
