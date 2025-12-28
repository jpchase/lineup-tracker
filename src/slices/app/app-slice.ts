/** @format */

import { createSlice, PayloadAction, type WithSlice } from '@reduxjs/toolkit';
import { PersistConfig } from 'redux-persist';
import { getEnv } from '../../app/environment.js';
import type { RootState, ThunkResult } from '../../app/store.js';
import { Team } from '../../models/team.js';
import { buildSliceConfigurator, SliceConfigurator } from '../slice-configurator.js';
import { addTeam } from '../team/team-slice.js';

const env = getEnv();

let snackbarTimer: number;

export const showSnackbar = (): ThunkResult => (dispatch) => {
  dispatch(appSlice.actions.openSnackBar());
  window.clearTimeout(snackbarTimer);
  snackbarTimer = window.setTimeout(() => dispatch(appSlice.actions.closeSnackBar()), 3000);
};

export const offlineChanged =
  (offline: boolean): ThunkResult =>
  (dispatch, getState) => {
    const appState = getState().app!;
    // Show the snackbar only if offline status changes.
    if (offline !== appState.offline && !env.disableOfflineDetection) {
      dispatch(showSnackbar());
    }
    dispatch(appSlice.actions.updateOffline(offline));
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
declare module '../reducer.js' {
  export interface LazyLoadedSlices extends WithSlice<typeof appSlice> {}
}

export function getAppSliceConfigurator(): SliceConfigurator {
  const persistConfig: Partial<PersistConfig<AppState>> = {
    whitelist: ['teamId', 'teamName'],
  };
  return buildSliceConfigurator(appSlice, persistConfig);
}

export const { currentTeamChanged, updateDrawerState, updatePage } = appSlice.actions;
export const actions = appSlice.actions;
export const appReducer = appSlice.reducer;

function setCurrentTeam(state: AppState, teamId: string, teamName: string) {
  state.teamId = teamId;
  state.teamName = teamName;
}
