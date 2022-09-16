import { ReducersMapObject, StoreEnhancer, combineReducers as reduxCombineReducers } from '@reduxjs/toolkit';

type CombineReducers = typeof reduxCombineReducers;
type ReducersMap = Parameters<CombineReducers>[0];

export interface LazyStore {
  addReducers: (newReducers: ReducersMapObject) => void;
  hasReducer: (key: string) => boolean;
}

export const lazyReducerEnhancer =
  (combineReducers: CombineReducers) => {

    const enhancer: StoreEnhancer<LazyStore> = (nextCreator) => {

      return (origReducer, preloadedState) => {
        // Preserve initial state for not-yet-loaded reducers, defining a no-op
        // placeholder reducer.
        const combinePreservingInitialState = (reducers: ReducersMap) => {
          if (preloadedState) {
            const reducerNames = Object.keys(reducers);
            Object.keys(preloadedState).forEach(item => {
              if (!reducerNames.includes(item)) {
                reducers[item] = (state = null) => state;
              }
            });
          }
          return combineReducers(reducers);
        };

        let lazyReducers = {};
        const nextStore = nextCreator(origReducer, preloadedState);
        return {
          ...nextStore,
          hasReducer(key) {
            return key in lazyReducers;
          },
          addReducers(newReducers) {
            const combinedReducerMap: ReducersMapObject = {
              ...lazyReducers,
              ...newReducers
            };

            this.replaceReducer(combinePreservingInitialState(lazyReducers = combinedReducerMap));
          }
        }
      }
    }

    return enhancer;
  };
