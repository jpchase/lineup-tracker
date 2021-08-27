import { getAuth, signInWithPopup } from 'firebase/auth';
import firebase_app from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import { debug } from './common/debug';
import { useTestData } from './init';

const debugFirebase = debug('firebase');

// TODO: Still need the window['firebase'] for testing?
export const firebaseRef: typeof firebase_app = (window as any)['firebase'] || firebase_app;

// Initialize Firebase
const config = {
  apiKey: "AIzaSyBLpPCwxt2wiFEmVgEPZSsnHw8u-6EfMPI",
  authDomain: "resplendent-fire-4542.firebaseapp.com",
  projectId: "resplendent-fire-4542",
};
export const firebaseApp = firebaseRef.initializeApp(config);

const firestore = firebaseRef.firestore();

const settings: firebase_app.firestore.Settings = {
  cacheSizeBytes: firebase_app.firestore.CACHE_SIZE_UNLIMITED,
  merge: true
};

let enablePersistence = true;
if (useTestData()) {
  // Connect to the emulator, instead of the actual Firestore database.
  debugFirebase('Use the Firebase emulators');
  enablePersistence = false;
  settings.host = 'localhost:8790';
  settings.ssl = false;

  // @ts-expect-error Typings are not updated for |options| parameter.
  firebaseRef.auth().useEmulator('http://localhost:9099/', { disableWarnings: true });
}

firestore.settings(settings);
if (enablePersistence) {
  firestore.enablePersistence({ synchronizeTabs: true })
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

export default firebaseRef;

export const authRef = getAuth(firebaseApp);
export const provider = new firebaseRef.auth.GoogleAuthProvider();

// Trivial wrapper, mainly to allow for mocking in tests.
export const auth = {
  signInWithPopup: signInWithPopup
};
