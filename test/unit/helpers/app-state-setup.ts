/** @format */

import { Team } from '@app/models/team.js';
import { APP_INITIAL_STATE, AppState } from '@app/slices/app/app-slice.js';

export function buildInitialAppState(): AppState {
  return {
    ...APP_INITIAL_STATE,
  };
}

export function buildAppStateWithCurrentTeam(team: Team, rest?: Partial<AppState>): AppState {
  const state: AppState = {
    ...buildInitialAppState(),
    ...rest,
  };
  if (team) {
    state.teamId = team.id;
    state.teamName = team.name;
  }
  return state;
}
