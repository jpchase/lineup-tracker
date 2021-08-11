/**
@license
*/

import { Reducer } from 'redux';
import { createAction, createReducer } from '@reduxjs/toolkit';
import { Roster } from '../models/player';
import { Team, Teams } from '../models/team';
import {
  ADD_TEAM,
  CHANGE_TEAM,
  ADD_PLAYER,
  GET_ROSTER,
  GET_TEAMS
} from '../slices/team-types';
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

function withTeamPayload<T extends Team>() {
  return (t: T) => ({ payload: t })
}
export const addTeam = createAction(ADD_TEAM, withTeamPayload());

const newReducer: Reducer<TeamState, RootAction> = createReducer(INITIAL_STATE, (builder) => {
  builder
    .addCase(addTeam, (newState, action) => {
      const team = action.payload;
      newState.teams[team.id] = team;
      setCurrentTeam(newState, team.id);
    })
});

const oldReducer: Reducer<TeamState, RootAction> = createReducer(INITIAL_STATE, {

  [CHANGE_TEAM]: (newState, action) => {
    setCurrentTeam(newState, action.teamId);
  },

  [ADD_PLAYER]: (newState, action) => {
    newState.roster[action.player.id] = action.player;
  },

  [GET_ROSTER]: (newState, action) => {
    newState.roster = action.roster;
  },

  [GET_TEAMS]: (newState, action) => {
    newState.teams = action.teams;
    if (!newState.teamId && action.cachedTeamId && newState.teams[action.cachedTeamId]) {
      setCurrentTeam(newState, action.cachedTeamId);
    }
  }
});

function setCurrentTeam(newState: TeamState, teamId: string) {
  const team = newState.teams[teamId];
  newState.teamId = team.id;
  newState.teamName = team.name;
}

const team: Reducer<TeamState, RootAction> = function (state, action) {
  return oldReducer(newReducer(state, action), action);
}

export default team;

export const currentTeamIdSelector = (state: RootState) => state.team && state.team.teamId;
