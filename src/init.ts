import { installRouter } from 'pwa-helpers/router';
import { navigate } from './actions/app.js';
import { setupAuthListeners, startAppListening } from './app/action-listeners.js';
import { debug } from './common/debug.js';
import { getUser } from './slices/auth/auth-slice.js';
// import { getTeams } from './slices/team/team-slice.js';
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
  const urlParams = new URLSearchParams(location.search);

  // Initialize action listeners to handle changes in auth state.
  setupAuthListeners(startAppListening);

  const initTeamId = urlParams.get('team');
  const initUserId = urlParams.get('user');
  if (initTeamId || initUserId) {
    // save in state for later use retrieving teams
    // store.dispatch(appInitValues(initTeamId, initUserId));
  }

  // Get the authenticated user (if signed in), and then load the teams for
  // that user.
  try {
    debugInit(`get user`);
    const userSignedId = await store.dispatch(getUser());
    if (userSignedId) {
      debugInit(`signed in, get teams`);
      // await teamsLoaded();
    } else {
      debugInit(`not signed in`);
    }
  } catch (e: unknown) {
    debugInit(`error during init: ${e}`);
    if (e instanceof Error) {
      console.error(`Error initializing teams [${e.name}]: ${e.message}\nat ${e.stack}`);
    }
  }
  // Set the initialized data flag before installing the router. The router will
  // load a page, which may depend on the initialization being complete.
  window.document.body.dataset.appInitialized = 'true';

  // Wait for the loading actions to complete (success or error), before any navigation.
  debugInit(`install router`);
  installRouter((location) => store.dispatch(navigate(location)));

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
