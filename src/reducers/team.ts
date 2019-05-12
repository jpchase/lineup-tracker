/**
@license
*/

import { Reducer } from 'redux';
import { Roster, Teams } from '../models/team';
import {
  ADD_TEAM,
  CHANGE_TEAM,
  GET_ROSTER,
  GET_TEAMS
} from '../actions/team';
import { RootAction } from '../store';

export interface TeamState {
  teams: Teams;
  teamId: string;
  teamName: string;
  roster: Roster;
  error?: string;
}

const INITIAL_STATE: TeamState = {
  teams: {},
  teamId: '',
  teamName: '',
  roster: {},
  error: ''
};

const team: Reducer<TeamState, RootAction> = (state = INITIAL_STATE, action) => {
  const newState: TeamState = {
    ...state,
    teams: { ...state.teams },
  };
  switch (action.type) {
    case ADD_TEAM:
      console.log(`team.ts - reducer: ${JSON.stringify(action)}, ${JSON.stringify(state)}`);
      newState.teamId = action.team.id;
      newState.teamName = action.team.name;
      newState.teams[action.team.id] = action.team;
      return newState;

    case CHANGE_TEAM:
      newState.teamId = action.teamId;
      newState.teamName = state.teams[action.teamId].name;
      console.log(`team.ts - reducer: ${JSON.stringify(action)}, in = ${JSON.stringify(state)}, new = ${JSON.stringify(newState)}`);
      return newState;

    case GET_ROSTER:
      console.log(`team.ts - reducer: ${JSON.stringify(action)}, ${JSON.stringify(state)}`);
      newState.roster = action.roster;
      return newState;

    case GET_TEAMS:
      console.log(`team.ts - reducer: ${JSON.stringify(action)}, ${JSON.stringify(state)}`);
      newState.teams = action.teams;
      return newState;

    default:
      return state;
  }
};

export default team;
