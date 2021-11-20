/**
@license
*/

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Player, Roster } from '../../models/player.js';
import { Team, Teams } from '../../models/team.js';
import { RootState } from '../../store.js';

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

const teamSlice = createSlice({
  name: 'team',
  initialState: INITIAL_STATE,
  reducers: {
    addTeam: (newState, action: PayloadAction<Team>) => {
      const team = action.payload;
      newState.teams[team.id] = team;
      setCurrentTeam(newState, team.id);
    },

    changeTeam: {
      reducer: (newState, action: PayloadAction<{ teamId: string }>) => {
        setCurrentTeam(newState, action.payload.teamId);
      },
      prepare: (teamId: string) => {
        return { payload: { teamId } };
      }
    },

    addPlayer: (newState, action: PayloadAction<Player>) => {
      const player = action.payload;
      newState.roster[player.id] = player;
    },

    getRoster: (newState, action: PayloadAction<Roster>) => {
      newState.roster = action.payload;
    },

    getTeams: {
      reducer: (newState, action: PayloadAction<{ teams: Teams, cachedTeamId?: string }>) => {
        newState.teams = action.payload.teams;
        const cachedTeamId = action.payload.cachedTeamId;
        if (!newState.teamId && cachedTeamId && newState.teams[cachedTeamId]) {
          setCurrentTeam(newState, cachedTeamId);
        }
      },
      prepare: (teams: Teams, cachedTeamId?: string) => {
        return {
          payload: {
            teams,
            cachedTeamId
          }
        };
      },
    },
  }
});

const { actions, reducer } = teamSlice;

export const team = reducer;
export const { addTeam, changeTeam, addPlayer, getRoster, getTeams } = actions;

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

export const currentTeamIdSelector = (state: RootState) => state.team && state.team.teamId;
