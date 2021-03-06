/**
@license
Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import { Action, ActionCreator } from 'redux';
import { ThunkAction } from 'redux-thunk';
import { RootState } from '../store';
export const UPDATE_PAGE = 'UPDATE_PAGE';
export const UPDATE_OFFLINE = 'UPDATE_OFFLINE';
export const UPDATE_DRAWER_STATE = 'UPDATE_DRAWER_STATE';
export const OPEN_SNACKBAR = 'OPEN_SNACKBAR';
export const CLOSE_SNACKBAR = 'CLOSE_SNACKBAR';

export interface AppActionUpdatePage extends Action<'UPDATE_PAGE'> { page: string };
export interface AppActionUpdateOffline extends Action<'UPDATE_OFFLINE'> { offline: boolean };
export interface AppActionUpdateDrawerState extends Action<'UPDATE_DRAWER_STATE'> { opened: boolean };
export interface AppActionOpenSnackbar extends Action<'OPEN_SNACKBAR'> { };
export interface AppActionCloseSnackbar extends Action<'CLOSE_SNACKBAR'> { };
export type AppAction = AppActionUpdatePage | AppActionUpdateOffline | AppActionUpdateDrawerState | AppActionOpenSnackbar | AppActionCloseSnackbar;

type ThunkResult = ThunkAction<void, RootState, undefined, AppAction>;

export const navigate: ActionCreator<ThunkResult> = (location: Location) => (dispatch) => {
  // Extract the page name from path.
  const pathname = location.pathname;
  const parts = pathname.slice(1).split('/');
  let page = parts[0] || 'viewHome';

  console.log(`navigate: got page = ${page} from location`, location);
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

const updatePage: ActionCreator<AppActionUpdatePage> = (page: string) => {
  return {
    type: UPDATE_PAGE,
    page
  };
};

let snackbarTimer: number;

export const showSnackbar: ActionCreator<ThunkResult> = () => (dispatch) => {
  dispatch({
    type: OPEN_SNACKBAR
  });
  window.clearTimeout(snackbarTimer);
  snackbarTimer = window.setTimeout(() =>
    dispatch({ type: CLOSE_SNACKBAR }), 3000);
};

export const updateOffline: ActionCreator<ThunkResult> = (offline: boolean) => (dispatch, getState) => {
  const appState = getState().app!;
  // Show the snackbar only if offline status changes.
  if (offline !== appState.offline && !appState.useTestData) {
    dispatch(showSnackbar());
  }
  dispatch({
    type: UPDATE_OFFLINE,
    offline
  });
};

export const updateDrawerState: ActionCreator<AppActionUpdateDrawerState> = (opened: boolean) => {
  return {
    type: UPDATE_DRAWER_STATE,
    opened
  };
};
