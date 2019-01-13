import * as firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/firestore';

// Initialize Firebase
const config = {
  apiKey: "AIzaSyBLpPCwxt2wiFEmVgEPZSsnHw8u-6EfMPI",
  authDomain: "resplendent-fire-4542.firebaseapp.com",
  projectId: "resplendent-fire-4542",
};
firebase.initializeApp(config);

const firestore = firebase.firestore();
const settings = {
  timestampsInSnapshots: true,
};
firestore.settings(settings);

export default firebase;

export const authRef: firebase.auth.Auth = firebase.auth() as firebase.auth.Auth;
export const provider = new firebase.auth.GoogleAuthProvider();

export {
  firestore,
};
