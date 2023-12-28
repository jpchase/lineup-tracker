/** @format */

import { createSlice, PayloadAction, type WithSlice } from '@reduxjs/toolkit';
import { getEnv } from '../../app/environment.js';
import { Team } from '../../models/team.js';
import type { RootState, ThunkResult } from '../../store.js';
import { addTeam } from '../team/team-slice.js';

const env = getEnv();

let snackbarTimer: number;

export const showSnackbar = (): ThunkResult => (dispatch) => {
  dispatch(openSnackBar());
  window.clearTimeout(snackbarTimer);
  snackbarTimer = window.setTimeout(() => dispatch(closeSnackBar()), 3000);
};

export const offlineChanged =
  (offline: boolean): ThunkResult =>
  (dispatch, getState) => {
    const appState = getState().app!;
    // Show the snackbar only if offline status changes.
    if (offline !== appState.offline && !env.disableOfflineDetection) {
      dispatch(showSnackbar());
    }
    dispatch(updateOffline(offline));
  };

export const selectCurrentTeam = (state: RootState): Team | undefined => {
  if (!state.app?.teamId) {
    return undefined;
  }
  return {
    id: state.app.teamId,
    name: state.app.teamName,
  };
};

export const APP_SLICE_NAME = 'app';

export interface AppState {
  page: string;
  offline: boolean;
  drawerOpened: boolean;
  snackbarOpened: boolean;
  teamId: string;
  teamName: string;
}

export const APP_INITIAL_STATE: AppState = {
  page: '',
  offline: false,
  drawerOpened: false,
  snackbarOpened: false,
  teamId: '',
  teamName: '',
};

export const appSlice = createSlice({
  name: APP_SLICE_NAME,
  initialState: APP_INITIAL_STATE,
  reducers: {
    currentTeamChanged: {
      reducer: (state, action: PayloadAction<{ teamId: string; teamName: string }>) => {
        setCurrentTeam(state, action.payload.teamId, action.payload.teamName);
      },
      prepare: (teamId: string, teamName: string) => {
        return { payload: { teamId, teamName } };
      },
    },
    updatePage: {
      reducer: (state, action: PayloadAction<{ page: string }>) => {
        state.page = action.payload.page;
      },
      prepare: (page: string) => {
        return { payload: { page } };
      },
    },
    updateOffline: {
      reducer: (state, action: PayloadAction<{ offline: boolean }>) => {
        state.offline = action.payload.offline;
      },
      prepare: (offline: boolean) => {
        return { payload: { offline } };
      },
    },
    updateDrawerState: {
      reducer: (state, action: PayloadAction<{ opened: boolean }>) => {
        state.drawerOpened = action.payload.opened;
      },
      prepare: (opened: boolean) => {
        return { payload: { opened } };
      },
    },
    openSnackBar: (state) => {
      state.snackbarOpened = true;
    },
    closeSnackBar: (state) => {
      state.snackbarOpened = false;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(addTeam, (state, action) => {
      setCurrentTeam(state, action.payload.id, action.payload.name);
    });
  },
});

// Extend the root state typings with this slice.
//  - The module "name" is actually the relative path to interface definition.
declare module '..' {
  export interface LazyLoadedSlices extends WithSlice<typeof appSlice> {}
}

const { actions, reducer } = appSlice;

export const {
  currentTeamChanged,
  openSnackBar,
  closeSnackBar,
  updateDrawerState,
  updateOffline,
  updatePage,
} = actions;
export const appReducer = reducer;

function setCurrentTeam(state: AppState, teamId: string, teamName: string) {
  state.teamId = teamId;
  state.teamName = teamName;
}
