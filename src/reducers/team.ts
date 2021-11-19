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
import { RootState } from '../store.js';

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

function withPayloadType<T>() {
  return (t: T) => ({ payload: t })
}

export const addTeam = createAction(ADD_TEAM, withPayloadType<Team>());
export const changeTeam = createAction(CHANGE_TEAM, (teamId: string) => {
  return { payload: { teamId } };
});
export const getTeams = createAction(GET_TEAMS, (teams: Teams, cachedTeamId?: string) => {
  return {
    payload: {
      teams,
      cachedTeamId
    }
  };
});

export const addPlayer = createAction(ADD_PLAYER, withPayloadType<Player>());
export const getRoster = createAction(GET_ROSTER, withPayloadType<Roster>());

const team: Reducer<TeamState> = createReducer(INITIAL_STATE, (builder) => {
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
    .addCase(getRoster, (newState, action) => {
      newState.roster = action.payload;
    })
    .addCase(getTeams, (newState, action) => {
      newState.teams = action.payload.teams;
      const cachedTeamId = action.payload.cachedTeamId;
      if (!newState.teamId && cachedTeamId && newState.teams[cachedTeamId]) {
        setCurrentTeam(newState, cachedTeamId);
      }

    })
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

export default team;

export const currentTeamIdSelector = (state: RootState) => state.team && state.team.teamId;
