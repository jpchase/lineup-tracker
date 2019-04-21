import * as firebase_app from 'firebase/app';
import 'firebase/auth';
import 'firebase/firestore';

export const firebaseRef = (window as any)['firebase'] || firebase_app;

// Initialize Firebase
const config = {
  apiKey: "AIzaSyBLpPCwxt2wiFEmVgEPZSsnHw8u-6EfMPI",
  authDomain: "resplendent-fire-4542.firebaseapp.com",
  projectId: "resplendent-fire-4542",
};
firebaseRef.initializeApp(config);

const firestore = firebaseRef.firestore();

const settings = {
  timestampsInSnapshots: true,
};
firestore.settings(settings);
firestore.enablePersistence()
    .catch(function(err: any) {
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

export default firebaseRef;

export const authRef: firebase.auth.Auth = firebaseRef.auth() as firebase.auth.Auth;
export const provider = new firebaseRef.auth.GoogleAuthProvider();
