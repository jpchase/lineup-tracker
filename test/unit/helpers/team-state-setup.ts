/** @format */

import { Teams } from '@app/models/team.js';
import { TEAM_INITIAL_STATE, TeamState } from '@app/slices/team/team-slice.js';

export function buildInitialTeamState(): TeamState {
  return {
    ...TEAM_INITIAL_STATE,
    // Set to a new object, otherwise multiple tests will share the instance
    // on the constant.
    teams: {},
    roster: {},
  };
}

export function buildTeamStateWithTeams(teams: Teams, rest?: Partial<TeamState>): TeamState {
  const state: TeamState = {
    ...buildInitialTeamState(),
    ...rest,
  };
  if (teams) {
    state.teams = { ...teams };
  }
  return state;
}
