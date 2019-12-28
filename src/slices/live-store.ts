import { store as globalStore, RootStore, SliceStoreConfigurator } from '../store';
import { live } from '../reducers/live';

let initialized = false;

export function getLiveStore(storeInstance?: RootStore, hydrate: boolean = true): RootStore {
  console.log(`getLiveStore called: storeInstance is set ${storeInstance ? true : false}`);
  const store = storeInstance || globalStore;
  if (!initialized) {
    console.log('getLiveStore: first call, do initialization');
    // Lazy load the reducer
    store.addReducers({
      live
    });

    if (hydrate) {
      console.log('getLiveStore: setup hydration');

      store.subscribe(() => {
        console.log('getLiveStore: in store.subscribe()');
      });
    }
    initialized = true;
  }
  return store;
}

export function getLiveStoreConfigurator(hydrate: boolean): SliceStoreConfigurator {
  return (storeInstance?: RootStore) => {
    return getLiveStore(storeInstance, hydrate);
  };
}
