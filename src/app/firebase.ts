/** @format */

import { initializeApp } from 'firebase/app';
import {
  connectAuthEmulator,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
} from 'firebase/auth';
import {
  CACHE_SIZE_UNLIMITED,
  connectFirestoreEmulator,
  FirestoreSettings,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { logger } from '../util/logger.js';
import { getEnv } from './environment.js';

const debugFirebase = logger('firebase');

const env = getEnv();

// Initialize Firebase
const firebaseApp = initializeApp(env.firebase.options);

const firestoreSettings: FirestoreSettings = {};
if (env.firebase.enablePersistence) {
  firestoreSettings.localCache = persistentLocalCache({
    cacheSizeBytes: CACHE_SIZE_UNLIMITED,
    tabManager: persistentMultipleTabManager(),
  });
}

const firestore = initializeFirestore(firebaseApp, firestoreSettings);
const authRef = getAuth(firebaseApp);

if (env.firebase.useEmulators && env.firebase.emulators) {
  // Connect to the emulators, instead of the actual services.
  debugFirebase('Use the Firebase emulators');
  const emulators = env.firebase.emulators;
  connectFirestoreEmulator(firestore, emulators.firestore.hostname, emulators.firestore.port);
  connectAuthEmulator(authRef, `http://${emulators.auth.hostname}:${emulators.auth.port}/`, {
    disableWarnings: true,
  });
}

// Trivial wrapper, mainly to allow for mocking in tests.
export const firebaseRefs = {
  // app: firebaseApp,
  auth: authRef,
  firestore,
};
export const auth = {
  provider: new GoogleAuthProvider(),
  signInWithPopup,
  onAuthStateChanged,
};
