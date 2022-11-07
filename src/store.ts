import {
  Action,
  AnyAction,
  combineReducers,
  configureStore,
  EmptyObject,
  Reducer,
  ReducersMapObject,
  Store,
  ThunkAction,
  ThunkDispatch
} from '@reduxjs/toolkit';
import { listenerMiddleware } from './app/action-listeners.js';
import dynamicMiddlewares from './middleware/dynamic-middlewares';
import { lazyReducerEnhancer, LazyStore } from './middleware/lazy-reducers.js';
import { configureAppStore } from './slices/app/app-module-configurator.js';
import type { AppState, APP_SLICE_NAME } from './slices/app/app-slice.js';
import type { AuthState } from './slices/auth/auth-slice.js';
import type { GameState } from './slices/game/game-slice.js';
import type { LiveState } from './slices/live/live-slice.js';
import type { TeamState } from './slices/team/team-slice.js';

// Overall state extends static states and partials lazy states.
export interface RootState {
  [APP_SLICE_NAME]?: AppState;
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

export function combineReducersWithReset<S extends EmptyObject, A extends Action>(
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

export function setupStore(preloadedState?: RootState) {
  // Initializes the Redux store with a lazyReducerEnhancer, to allow adding reducers
  // after the store is created.
  //  - Type magic is a workaround for https://github.com/reduxjs/redux-toolkit/issues/2241
  const baseStore = configureStore({
    reducer: (state => state) as Reducer<RootState>,
    preloadedState,
    enhancers: [lazyReducerEnhancer(combineReducersWithReset)],
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(listenerMiddleware.middleware, dynamicMiddlewares)
  });
  type BaseStore = typeof baseStore;

  const store: RootStore = baseStore as BaseStore & LazyStore;

  // Initially loaded reducers.
  configureAppStore(store);

  return store;
}

export const store: RootStore = setupStore();

export type AppDispatch = typeof store.dispatch;
export type ThunkResult = ThunkAction<void, RootState, undefined, AnyAction>;
export type ThunkPromise<R> = ThunkAction<Promise<R>, RootState, undefined, AnyAction>;
