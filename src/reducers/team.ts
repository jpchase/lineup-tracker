/**
@license
*/

import { Reducer } from 'redux';
import { Roster, Team } from '../models/team.js';
import {
  GET_ROSTER,
  GET_TEAMS
} from '../actions/team.js';
import { RootAction } from '../store.js';

export interface TeamState {
  teams: Team[];
  teamId: string;
  roster: Roster;
  error: string;
}

const INITIAL_STATE: TeamState = {
  teams: [],
  teamId: '',
  roster: {},
  error: ''
};

const team: Reducer<TeamState, RootAction> = (state = INITIAL_STATE, action) => {
  switch (action.type) {
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
