/** @format */

import { debug } from '../../common/debug.js';
import { RootStore, SliceStoreConfigurator, store as globalStore } from '../../store.js';
import { teamSlice } from './team-slice.js';
import { rootReducer } from '../index.js';

const debugStore = debug('team-store');

let initialized = false;

export function configureTeamModule(
  storeInstance?: RootStore,
  _hydrate: boolean = true
): RootStore {
  debugStore(`getTeamStore called: storeInstance is set ${!!storeInstance}`);
  const store = storeInstance || globalStore;
  if (!initialized) {
    debugStore(
      `getTeamStore: ${
        initialized ? 'team state missing, add reducer' : 'first call, do initialization'
      }`
    );
    // Lazy load the reducer
    rootReducer.inject(teamSlice);
    initialized = true;
  }
  return store;
}

export function getTeamModuleConfigurator(hydrate: boolean): SliceStoreConfigurator {
  return (storeInstance?: RootStore) => {
    return configureTeamModule(storeInstance, hydrate);
  };
}
