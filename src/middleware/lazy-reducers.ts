/** @format */

import {
  Reducer,
  ReducersMapObject,
  StoreEnhancer,
  combineReducers as reduxCombineReducers,
} from '@reduxjs/toolkit';
import type { RootState } from '../store.js';

type ReducersMap = ReducersMapObject<RootState>;
type CombineReducers = typeof reduxCombineReducers<ReducersMap>;

export interface LazyStore {
  addReducers: (newReducers: ReducersMap) => void;
  hasReducer: (key: string) => boolean;
}

export const lazyReducerEnhancer = (combineReducers: CombineReducers) => {
  // @ts-expect-error Some error about the types of reducers not working
  const enhancer: StoreEnhancer<LazyStore> = (nextCreator) => {
    return (origReducer: Reducer<RootState>, preloadedState: Partial<RootState> | undefined) => {
      // Preserve initial state for not-yet-loaded reducers, defining a no-op
      // placeholder reducer.
      const combinePreservingInitialState = (reducers: ReducersMap) => {
        let reducersToCombine = reducers;
        if (preloadedState) {
          const reducerNames = Object.keys(reducers);
          const placeholders = {} as ReducersMap;
          Object.keys(preloadedState).forEach((item) => {
            if (reducerNames.includes(item)) {
              return;
            }
            // @ts-expect-error Doesn't like state = null
            placeholders[item as keyof ReducersMap] = (state = null) => state;
          });
          // When adding placeholders, do not modify the input `reducers`
          // object, create a copy instead.
          if (Object.keys(placeholders).length > 0) {
            reducersToCombine = {
              ...reducers,
              ...placeholders,
            };
          }
        }
        return combineReducers(reducersToCombine) as Reducer<RootState>;
      };

      let lazyReducers = {} as ReducersMap;
      // @ts-expect-error The `auth` state is no longer optional, as a static slice
      const nextStore = nextCreator(origReducer, preloadedState);
      const newStore = {
        ...nextStore,
        hasReducer(key: string) {
          return key in lazyReducers;
        },
        addReducers(newReducers: ReducersMap) {
          const combinedReducerMap: ReducersMap = {
            ...lazyReducers,
            ...newReducers,
          };

          this.replaceReducer(combinePreservingInitialState((lazyReducers = combinedReducerMap)));
        },
      };
      return newStore;
    };
  };

  return enhancer;
};
