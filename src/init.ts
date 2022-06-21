import { installRouter } from 'pwa-helpers/router';
import { navigate } from './actions/app.js';
import { getUser } from './actions/auth.js';
import { getTeams } from './slices/team/team-slice.js';
import { store } from './store.js';

let globalErrorHandler = false;
let appInitialized = false;

export async function initApp() {
  if (appInitialized) {
    console.log(`initApp: already done`);
    return;
  }
  console.log(`initApp: starting`);
  // enableAllPlugins();
  const urlParams = new URLSearchParams(location.search);

  // Get the authenticated user (if signed in), and then load the teams for
  // that user.
  try {
    console.log(`initApp: get user`);
    await store.dispatch(getUser());
    console.log(`initApp: get teams`);
    await store.dispatch(getTeams(urlParams.get('team') || undefined));
  } catch (e: unknown) {
    console.log(`initApp: some error`);
    if (e instanceof Error) {
      console.error(`Error initializing teams [${e.name}]: ${e.message}\nat ${e.stack}`);
    }
  }
  // Set the initialized data flag before installing the router. The router will
  // load a page, which may depend on the initialization being complete.
  window.document.body.dataset.appInitialized = 'true';

  // Wait for the loading actions to complete (success or error), before any navigation.
  console.log(`initApp: install router`);
  installRouter((location) => store.dispatch(navigate(location)));

  appInitialized = true;
  console.log(`initApp: finished\n${JSON.stringify(window.document.body.dataset)}`);
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
