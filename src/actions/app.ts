import { AnyAction } from '@reduxjs/toolkit';
import { ActionCreator } from 'redux';
import { ThunkAction } from 'redux-thunk';
import { getEnv } from '../app/environment.js';
import { closeSnackBar, openSnackBar, updateDrawerState, updateOffline, updatePage } from '../slices/app/app-slice.js';
import { RootState } from '../store.js';

const env = getEnv();

type ThunkResult = ThunkAction<void, RootState, undefined, AnyAction>;

export const navigate: ActionCreator<ThunkResult> = (location: Location) => (dispatch) => {
  // Extract the page name from path.
  const pathname = location.pathname;
  const parts = pathname.slice(1).split('/');
  let page = parts[0] || 'viewHome';

  console.log(`navigate: got page = ${page} from location`, location.href);
  // Game views have path: /{view}/{gameId}
  const gameId = parts[1];

  dispatch(loadPage(page, gameId));

  // Close the drawer - in case the *path* change came from a link in the drawer.
  dispatch(updateDrawerState(false));
};

const loadPage: ActionCreator<ThunkResult> = (page: string, gameId: string) => async (dispatch) => {
  console.log(`loadPage: page = ${page}, gameId = ${gameId}`);
  switch (page) {
    case 'viewHome':
      import('../components/lineup-view-home').then(() => {
        // Put code in here that you want to run every time when
        // navigating to viewHome after lineup-view-home.js is loaded.
      });
      break;
    case 'viewGames':
      import('../components/lineup-view-games');
      break;
    case 'game':
      const detailModule = await import('../components/lineup-view-game-detail');
      // Fetch the data for the given game id.
      console.log(`loading game detail page for ${gameId}`);
      await dispatch(detailModule.getGame(gameId));
      break;
    case 'gameroster':
      const rosterModule = await import('../components/lineup-view-game-roster');
      // Fetch the data for the given game id.
      console.log(`loading game roster page for ${gameId}`);
      await dispatch(rosterModule.getGame(gameId));
      break;
    case 'viewRoster':
      import('../components/lineup-view-roster');
      break;
    case 'addNewTeam':
      import('../components/lineup-view-team-create');
      break;
    default:
      page = 'view404';
      import('../components/lineup-view404');
  }

  dispatch(updatePage(page));
};

let snackbarTimer: number;

export const showSnackbar: ActionCreator<ThunkResult> = () => (dispatch) => {
  dispatch(openSnackBar());
  window.clearTimeout(snackbarTimer);
  snackbarTimer = window.setTimeout(() =>
    dispatch(closeSnackBar()), 3000);
};

export const offlineChanged: ActionCreator<ThunkResult> = (offline: boolean) => (dispatch, getState) => {
  const appState = getState().app!;
  // Show the snackbar only if offline status changes.
  if (offline !== appState.offline && !env.disableOfflineDetection) {
    dispatch(showSnackbar());
  }
  dispatch(updateOffline(offline));
};
