/** @format */

import { setupAuthListeners, startAppListening } from './app/action-listeners.js';
import { debug } from './common/debug.js';
import { getUser } from './slices/auth/auth-slice.js';
import { store } from './store.js';

const debugInit = debug('initApp');
let globalErrorHandler = false;
let appInitialized = false;

export async function initApp() {
  if (appInitialized) {
    debugInit(`already done`);
    return;
  }
  debugInit(`starting`);
  // enableAllPlugins();
  // eslint-disable-next-line no-restricted-globals
  const urlParams = new URLSearchParams(location.search);

  // Initialize action listeners to handle changes in auth state.
  setupAuthListeners(startAppListening);

  const initTeamId = urlParams.get('team');
  const initUserId = urlParams.get('user');
  if (initTeamId || initUserId) {
    // save in state for later use retrieving teams
    // store.dispatch(appInitValues(initTeamId, initUserId));
  }

  // Get the authenticated user (if signed in).
  try {
    debugInit(`get user`);
    const userSignedIn = await store.dispatch(getUser());
    if (userSignedIn) {
      debugInit(`signed in, set team`);
    } else {
      debugInit(`not signed in`);
    }
  } catch (e: unknown) {
    if (e instanceof Error) {
      debugInit(`Error initializing teams [${e.name}]: ${e.message}\nat ${e.stack}`);
    } else {
      debugInit(`error during init: ${e}`);
    }
  }
  window.document.body.dataset.appInitialized = 'true';
  appInitialized = true;
  debugInit(`finished\n${JSON.stringify(window.document.body.dataset)}`);
}

if (!globalErrorHandler) {
  window.addEventListener('error', (e) => {
    console.error(`Unhandled error: ${e.message}\nat ${e.filename}:${e.lineno}`);
  });
  globalErrorHandler = true;
}

(async () => {
  await initApp();
})();
