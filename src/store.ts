/**
@license
*/

/// <reference path="./redux-mjs.d.ts" />

declare global {
  interface Window {
    process?: Object;
    __REDUX_DEVTOOLS_EXTENSION_COMPOSE__?: typeof compose;
  }
}

import { lazyReducerEnhancer, LazyStore } from 'pwa-helpers/lazy-reducer-enhancer.js';
import thunk, { ThunkDispatch, ThunkMiddleware } from 'redux-thunk';
import {
  Action,
  applyMiddleware,
  combineReducers,
  compose,
  createStore,
  Reducer,
  ReducersMapObject,
  Store,
  StoreEnhancer
} from 'redux/es/redux.mjs.js';
import { AppAction } from './actions/app';
import { AuthAction } from './actions/auth';
import { GameAction } from './actions/game';
import { GamesAction } from './actions/games';
import { TeamAction } from './actions/team';
import app, { AppState } from './reducers/app';
import { AuthState } from './reducers/auth';
import { GameState } from './reducers/game';
import { GamesState } from './reducers/games';
import { TeamState } from './reducers/team';

// Overall state extends static states and partials lazy states.
export interface RootState {
  app?: AppState;
  auth?: AuthState;
  game?: GameState;
  games?: GamesState;
  team?: TeamState;
}

const RESET_STATE = 'RESET_STATE';
export interface RootActionReset extends Action<typeof RESET_STATE> {};

export type RootAction = AppAction | AuthAction | GameAction | GamesAction | TeamAction | RootActionReset;

export type RootStore = Store<RootState, RootAction> & LazyStore & {
  dispatch: ThunkDispatch<RootState, undefined, RootAction>;
};

// Action creator to cause the store to be reset (primarily intended for testing).
export const resetState = (): RootActionReset => ({type: RESET_STATE});

export function combineReducersWithReset<S, A extends Action>(
  reducers: ReducersMapObject<S, A>
): Reducer<S, A> {
  const combinedReducer = combineReducers(reducers);
  const rootReducer: Reducer<S, A> = (state, action) => {
    if (action.type == RESET_STATE) {
      state = undefined;
    }
    return combinedReducer(state, action);
  }
  return rootReducer;
}

// Sets up a Chrome extension for time travel debugging.
// See https://github.com/zalmoxisus/redux-devtools-extension for more information.
const devCompose: <Ext0, Ext1, StateExt0, StateExt1>(
  f1: StoreEnhancer<Ext0, StateExt0>, f2: StoreEnhancer<Ext1, StateExt1>
) => StoreEnhancer<Ext0 & Ext1, StateExt0 & StateExt1> =
  window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

// Initializes the Redux store with a lazyReducerEnhancer (so that you can
// lazily add reducers after the store has been created) and redux-thunk (so
// that you can dispatch async actions). See the "Redux and state management"
// section of the wiki for more details:
// https://github.com/Polymer/pwa-starter-kit/wiki/4.-Redux-and-state-management
export const store: RootStore = createStore(
  state => state as Reducer<RootState, RootAction>,
  devCompose(
    lazyReducerEnhancer(combineReducersWithReset),
    applyMiddleware(thunk as ThunkMiddleware<RootState, RootAction>))
);

// Initially loaded reducers.
store.addReducers({
  app
});
