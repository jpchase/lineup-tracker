/**
@license
*/

import { Reducer } from 'redux';
import { Roster, Teams } from '../models/team.js';
import {
  ADD_TEAM,
  GET_ROSTER,
  GET_TEAMS
} from '../actions/team.js';
import { RootAction } from '../store.js';

export interface TeamState {
  teams: Teams;
  teamId: string;
  teamName: string;
  roster: Roster;
  error: string;
}

const TEAM_U16A = { id: 'U16A', name: 'Wat U16A' };

// TODO: Remove default U16A team data when have support for adding/editing teams.
const INITIAL_STATE: TeamState = {
  teams: {},
  teamId: TEAM_U16A.id,
  teamName: TEAM_U16A.name,
  roster: {},
  error: ''
};

const team: Reducer<TeamState, RootAction> = (state = INITIAL_STATE, action) => {
  switch (action.type) {
    case ADD_TEAM:
      console.log(`team.ts - reducer: ${JSON.stringify(action)}, ${state}`);
      const newState: TeamState = {
        ...state,
        teams: { ...state.teams },
        teamId: action.team.id,
        teamName: action.team.name
      };
      newState.teams[action.team.id] = action.team;
      return newState;

    case GET_ROSTER:
      console.log(`team.ts - reducer: ${JSON.stringify(action)}, ${state}`);
      return {
        ...state,
        roster: action.roster
      };

    case GET_TEAMS:
      console.log(`team.ts - reducer: ${JSON.stringify(action)}, ${state}`);
      return {
        ...state,
        teams: action.teams
      };

    default:
      return state;
  }
};

export default team;
