import { del, get, set } from 'idb-keyval';

// Trivial wrapper, mainly to allow for mocking in tests.
export const idb = {
  get: get,
  set: set,
  del: del
};
