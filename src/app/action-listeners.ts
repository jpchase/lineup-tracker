import { createListenerMiddleware, TypedStartListening, Unsubscribe } from '@reduxjs/toolkit';
import { debug } from '../common/debug.js';
import { userSignedIn } from '../slices/auth/auth-slice.js';
import { getTeams } from '../slices/team/team-slice.js';
import type { AppDispatch, RootState } from '../store.js';

const debugListeners = debug('listeners');

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
        // TODO: Get team id from state
        // const teamId = selectInitialTeamId(listenerApi.getState());
        const urlParams = new URLSearchParams(location.search);
        const teamId = urlParams.get('team') || undefined;
        debugListeners(`Signed in, get teams, with teamId = ${teamId}`);
        await listenerApi.dispatch(getTeams(teamId));
        debugListeners(`Signed in, done loading teams`);
      },
    }),
  ]

  return () => {
    subscriptions.forEach((unsubscribe) => unsubscribe())
  }
}
