import firebase_app from 'firebase/app';
import 'firebase/auth';
import 'firebase/firestore';
import { useTestData } from './init';

// TODO: Log bug against Firebase? The cjs module does this to ensure the default export is usable, but the esm module does not.
// function _interopDefault(ex: any) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

// export const firebaseRef = (window as any)['firebase'] || _interopDefault(firebase_app);
export const firebaseRef: typeof firebase_app = (window as any)['firebase'] || firebase_app;

// Initialize Firebase
const config = {
  apiKey: "AIzaSyBLpPCwxt2wiFEmVgEPZSsnHw8u-6EfMPI",
  authDomain: "resplendent-fire-4542.firebaseapp.com",
  projectId: "resplendent-fire-4542",
};
firebaseRef.initializeApp(config);

const firestore = firebaseRef.firestore();

const settings: firebase_app.firestore.Settings = {
  cacheSizeBytes: firebase_app.firestore.CACHE_SIZE_UNLIMITED,
};

let enablePersistence = true;
if (useTestData()) {
  // Connect to the emulator, instead of the actual Firestore database.
  enablePersistence = false;
  settings.host = 'localhost:8790';
  settings.ssl = false;
}

firestore.settings(settings);
if (enablePersistence) {
  firestore.enablePersistence({ synchronizeTabs: true })
    .catch(function (err: any) {
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

export const authRef: firebase_app.auth.Auth = firebaseRef.auth();// as firebase_app.auth.Auth;
export const provider = new firebaseRef.auth.GoogleAuthProvider();
