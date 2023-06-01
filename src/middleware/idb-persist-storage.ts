/** @format */

import { WebStorage } from 'redux-persist';
import { debug } from '../common/debug.js';
import { idb } from '../storage/idb-wrapper.js';

const debugPersist = debug('persist');

export class IdbPersistStorage implements WebStorage {
  getItem(key: string) {
    // debugPersist(`getItem: ${key}`);
    return idb.get(key);
  }

  setItem(key: string, item: string) {
    // debugPersist(`setItem: ${key}, ${item}`);
    return idb.set(key, item);
  }

  removeItem(key: string) {
    debugPersist(`removeItem: ${key}`);
    return idb.del(key);
  }
}
