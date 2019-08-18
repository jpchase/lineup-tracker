/**
@license
*/

import { Reducer } from 'redux';
import { Roster } from '../models/player';
import { Teams } from '../models/team';
import {
  ADD_TEAM,
  CHANGE_TEAM,
  ADD_PLAYER,
  GET_ROSTER,
  GET_TEAMS
} from '../actions/team';
import { RootAction, RootState } from '../store';

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
    ...state
  };
  switch (action.type) {
    case ADD_TEAM:
      newState.teams = { ...newState.teams };
      newState.teams[action.team.id] = action.team;
      setCurrentTeam(newState, action.team.id);
      return newState;

    case CHANGE_TEAM:
      setCurrentTeam(newState, action.teamId);
      return newState;

    case ADD_PLAYER:
      newState.roster = { ...newState.roster };
      newState.roster[action.player.id] = action.player;
      return newState;

    case GET_ROSTER:
      newState.roster = action.roster;
      return newState;

    case GET_TEAMS:
      newState.teams = action.teams;
      if (!newState.teamId && action.cachedTeamId && newState.teams[action.cachedTeamId]) {
        setCurrentTeam(newState, action.cachedTeamId);
      }
      return newState;

    default:
      return state;
  }
};

function setCurrentTeam(newState: TeamState, teamId: string) {
  const team = newState.teams[teamId];
  newState.teamId = team.id;
  newState.teamName = team.name;
}

export default team;

export const currentTeamIdSelector = (state: RootState) => state.team && state.team.teamId;
