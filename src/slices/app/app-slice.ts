import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { getEnv } from '../../app/environment.js';
import { Team } from '../../models/team.js';
import type { RootState, ThunkResult } from '../../store.js';
import { addTeam } from '../team/team-slice.js';

const env = getEnv();

export const loadPage = (page: string, gameId?: string): ThunkResult => async (dispatch) => {
  console.log(`loadPage: page = ${page}, gameId = ${gameId}`);
  switch (page) {
    case 'viewHome':
      import('../../components/lineup-view-home').then(() => {
        // Put code in here that you want to run every time when
        // navigating to viewHome after lineup-view-home.js is loaded.
      });
      break;
    case 'viewGames':
      import('../../components/lineup-view-games');
      break;
    case 'game':
      const detailModule = await import('../../components/lineup-view-game-detail');
      // Fetch the data for the given game id.
      console.log(`loading game detail page for ${gameId}`);
      await dispatch(detailModule.getGame(gameId!));
      break;
    case 'gameroster':
      const rosterModule = await import('../../components/lineup-view-game-roster');
      // Fetch the data for the given game id.
      console.log(`loading game roster page for ${gameId}`);
      await dispatch(rosterModule.getGame(gameId!));
      break;
    case 'viewRoster':
      import('../../components/lineup-view-roster');
      break;
    case 'addNewTeam':
      import('../../components/lineup-view-team-create');
      break;
    default:
      page = 'view404';
      import('../../components/lineup-view404');
  }

  dispatch(updatePage(page));
};

let snackbarTimer: number;

export const showSnackbar = (): ThunkResult => (dispatch) => {
  dispatch(openSnackBar());
  window.clearTimeout(snackbarTimer);
  snackbarTimer = window.setTimeout(() =>
    dispatch(closeSnackBar()), 3000);
};

export const offlineChanged = (offline: boolean): ThunkResult => (dispatch, getState) => {
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
}

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

const appSlice = createSlice({
  name: APP_SLICE_NAME,
  initialState: APP_INITIAL_STATE,
  reducers: {
    currentTeamChanged: {
      reducer: (state, action: PayloadAction<{ teamId: string, teamName: string }>) => {
        setCurrentTeam(state, action.payload.teamId, action.payload.teamName);
      },
      prepare: (teamId: string, teamName: string) => {
        return { payload: { teamId, teamName } };
      }
    },
    updatePage: {
      reducer: (state, action: PayloadAction<{ page: string }>) => {
        state.page = action.payload.page;
      },
      prepare: (page: string) => {
        return { payload: { page } };
      }
    },
    updateOffline: {
      reducer: (state, action: PayloadAction<{ offline: boolean }>) => {
        state.offline = action.payload.offline;
      },
      prepare: (offline: boolean) => {
        return { payload: { offline } };
      }
    },
    updateDrawerState: {
      reducer: (state, action: PayloadAction<{ opened: boolean }>) => {
        state.drawerOpened = action.payload.opened;
      },
      prepare: (opened: boolean) => {
        return { payload: { opened } };
      }
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

const { actions, reducer } = appSlice;

export const {
  currentTeamChanged,
  openSnackBar, closeSnackBar,
  updateDrawerState, updateOffline, updatePage
} = actions;
export const appReducer = reducer;

function setCurrentTeam(state: AppState, teamId: string, teamName: string) {
  state.teamId = teamId;
  state.teamName = teamName;
}
