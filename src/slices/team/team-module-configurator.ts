/** @format */

import { debug } from '../../common/debug.js';
import { RootStore, SliceStoreConfigurator } from '../../store.js';
import { rootReducer } from '../index.js';
import { teamSlice } from './team-slice.js';

const debugStore = debug('team-store');

let initialized = false;

export function configureTeamModule(storeInstance: RootStore, _hydrate: boolean = true): RootStore {
  debugStore(`getTeamStore called: storeInstance is set ${!!storeInstance}`);
  if (!storeInstance) {
    throw new Error(`getTeamStore: storeInstance must be provided`);
  }
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
  return storeInstance;
}

export function getTeamModuleConfigurator(hydrate: boolean): SliceStoreConfigurator {
  return (storeInstance?: RootStore) => {
    if (!storeInstance) {
      throw new Error(`storeInstance must be provided`);
    }
    return configureTeamModule(storeInstance, hydrate);
  };
}
