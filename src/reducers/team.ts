/**
@license
*/

import { Reducer } from 'redux';
import { Roster } from '../models/roster.js';
import {
  GET_ROSTER
} from '../actions/team.js';
import { RootAction } from '../store.js';

export interface TeamState {
  roster: Roster;
  error: string;
}

const INITIAL_STATE: TeamState = {
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
    default:
      return state;
  }
};

export default team;
