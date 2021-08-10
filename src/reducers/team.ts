/**
@license
*/

import { Reducer } from 'redux';
import { createReducer } from '@reduxjs/toolkit';
import { Roster } from '../models/player';
import { Teams } from '../models/team';
import {
  ADD_TEAM,
  CHANGE_TEAM,
  ADD_PLAYER,
  GET_ROSTER,
  GET_TEAMS
} from '../slices/team-types';
import { RootAction, RootState } from '../store';
import { TeamActionAddTeam } from '@app/actions/team';

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

const team: Reducer<TeamState, RootAction> = createReducer(INITIAL_STATE, {
  [ADD_TEAM]: (newState, action: TeamActionAddTeam) => {
    newState.teams[action.team.id] = action.team;
    setCurrentTeam(newState, action.team.id);
  },

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

export default team;

export const currentTeamIdSelector = (state: RootState) => state.team && state.team.teamId;
