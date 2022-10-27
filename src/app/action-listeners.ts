import { createListenerMiddleware, TypedStartListening, Unsubscribe } from '@reduxjs/toolkit';
import { getEnv } from '../app/environment.js';
import { debug } from '../common/debug.js';
import { currentTeamChanged } from '../slices/app/app-slice.js';
import { userSignedIn } from '../slices/auth/auth-slice.js';
import type { AppDispatch, RootState } from '../store.js';

const debugListeners = debug('listeners');
const env = getEnv();

export type AppStartListening = TypedStartListening<RootState, AppDispatch>

export const listenerMiddleware = createListenerMiddleware();
export const startAppListening =
  listenerMiddleware.startListening as AppStartListening

export function setupAuthListeners(
  startListening: AppStartListening
): Unsubscribe {
  const subscriptions = [
    startListening({
      actionCreator: userSignedIn,
      effect: async (_action, listenerApi) => {
        const urlParams = new URLSearchParams(location.search);
        const team = urlParams.get('team');
        debugListeners(`Signed in, set team = ${team}`);
        const initAction = initializeTeam(team);
        if (initAction) {
          await listenerApi.dispatch(initAction);
        }
        debugListeners(`Signed in, done setting team`);
      },
    }),
  ]

  return () => {
    subscriptions.forEach((unsubscribe) => unsubscribe())
  }
}

function initializeTeam(teamParam: string | null) {
  debugListeners(`initializeTeam: env = ${env.environment}, param = ${teamParam}`)
  switch (env.environment) {
    case 'dev':
    case 'test':
      // Only supported in testing environments, for convenience.
      break;
    default:
      return;
  }
  if (!teamParam) {
    return;
  }
  const teamParts = teamParam.split('|');
  if (teamParts.length < 2) {
    debugListeners(`Invalid 'team' parameter: ${teamParam}`);
    return;
  }
  const teamName = decodeURIComponent(teamParts[1]);
  return currentTeamChanged(teamParts[0], teamName);
}
