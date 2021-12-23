import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup } from 'firebase/auth';
import { CACHE_SIZE_UNLIMITED, connectFirestoreEmulator, enableMultiTabIndexedDbPersistence, initializeFirestore } from 'firebase/firestore';
import { getEnv } from './app/environment.js';
import { debug } from './common/debug';

const debugFirebase = debug('firebase');

const env = getEnv();

// Initialize Firebase
/*
const config = {
  apiKey: "AIzaSyBLpPCwxt2wiFEmVgEPZSsnHw8u-6EfMPI",
  authDomain: "resplendent-fire-4542.firebaseapp.com",
  projectId: "resplendent-fire-4542",
};
*/
const firebaseApp = initializeApp(env.firebase.options);

const firestore = initializeFirestore(firebaseApp, {
  cacheSizeBytes: CACHE_SIZE_UNLIMITED,
});
const authRef = getAuth(firebaseApp);

if (env.firebase.useEmulators && env.firebase.emulators) {
  // Connect to the emulators, instead of the actual services.
  debugFirebase('Use the Firebase emulators');
  const emulators = env.firebase.emulators
  connectFirestoreEmulator(firestore, emulators.firestore.hostname, emulators.firestore.port);
  connectAuthEmulator(authRef, `http://${emulators.auth.hostname}:${emulators.auth.port}/`, { disableWarnings: true });
}

if (env.firebase.enablePersistence) {
  enableMultiTabIndexedDbPersistence(firestore)
    .catch((err) => {
      if (err.code == 'failed-precondition') {
        // Multiple tabs open, persistence can only be enabled
        // in one tab at a a time.
        // ...
        console.log('Multiple tabs open, offline storage not available');
      } else if (err.code == 'unimplemented') {
        // The current browser does not support all of the
        // features required to enable persistence
        // ...
        console.log('Offline storage not supported');
      }
    });
}

// Trivial wrapper, mainly to allow for mocking in tests.
export const firebaseRefs = {
  // app: firebaseApp,
  auth: authRef,
  firestore: firestore
};
export const auth = {
  provider: new GoogleAuthProvider(),
  signInWithPopup: signInWithPopup,
  onAuthStateChanged: onAuthStateChanged

};
