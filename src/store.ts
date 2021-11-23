/**
@license
*/

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
  AnyAction,
  applyMiddleware,
  combineReducers,
  compose,
  createStore,
  Reducer,
  ReducersMapObject,
  Store,
  StoreEnhancer
} from 'redux';
import dynamicMiddlewares from './middleware/dynamic-middlewares';
import app, { AppState } from './reducers/app';
import { AuthState } from './reducers/auth';
import { GameState } from './reducers/game';
import type { LiveState } from './slices/live/live-slice.js';
import type { TeamState } from './slices/team/team-slice.js';

// Overall state extends static states and partials lazy states.
export interface RootState {
  app?: AppState;
  auth?: AuthState;
  game?: GameState;
  live?: LiveState;
  team?: TeamState;
}

const RESET_STATE = 'RESET_STATE';
export interface RootActionReset extends Action<typeof RESET_STATE> { };

export type RootStore = Store<RootState> & LazyStore & {
  dispatch: ThunkDispatch<RootState, undefined, AnyAction>;
};

export interface SliceStoreConfigurator {
  (storeInstance?: RootStore, ...rest: any[]): RootStore;
}

// Action creator to cause the store to be reset (primarily intended for testing).
export const resetState = (): RootActionReset => ({ type: RESET_STATE });

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
  state => state as Reducer<RootState>,
  devCompose(
    lazyReducerEnhancer(combineReducersWithReset),
    applyMiddleware(thunk as ThunkMiddleware<RootState>, dynamicMiddlewares))
);

// Initially loaded reducers.
store.addReducers({
  app
});
