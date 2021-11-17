/**
@license
*/

import { Reducer } from 'redux';
import { createAction, createReducer } from '@reduxjs/toolkit';
import { Player, Roster } from '../models/player';
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
export const changeTeam = createAction(CHANGE_TEAM, (teamId: string) => {
  return { payload: { teamId } };
});

export const addPlayer = createAction(ADD_PLAYER, (player: Player) => {
  return {
    payload: player
  };
});

const newReducer: Reducer<TeamState, RootAction> = createReducer(INITIAL_STATE, (builder) => {
  builder
    .addCase(addTeam, (newState, action) => {
      const team = action.payload;
      newState.teams[team.id] = team;
      setCurrentTeam(newState, team.id);
    })
    .addCase(changeTeam, (newState, action) => {
      setCurrentTeam(newState, action.payload.teamId);
    })
    .addCase(addPlayer, (newState, action) => {
      const player = action.payload;
      newState.roster[player.id] = player;
    })
});

const oldReducer: Reducer<TeamState, RootAction> = createReducer(INITIAL_STATE, {

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
  if (newState.teamId === teamId) {
    return;
  }
  const team = newState.teams[teamId];
  if (!team) {
    return;
  }
  newState.teamId = team.id;
  newState.teamName = team.name;
}

const team: Reducer<TeamState, RootAction> = function (state, action) {
  return oldReducer(newReducer(state, action), action);
}

export default team;

export const currentTeamIdSelector = (state: RootState) => state.team && state.team.teamId;
