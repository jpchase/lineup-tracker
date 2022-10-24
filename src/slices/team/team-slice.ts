/**
@license
*/

import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { debug } from '../../common/debug.js';
import { Player, Roster } from '../../models/player.js';
import { Team, Teams } from '../../models/team.js';
import { CollectionFilter, whereFilter } from '../../storage/firestore-reader.js';
import { idb } from '../../storage/idb-wrapper.js';
import { RootState, ThunkResult } from '../../store.js';
import { selectCurrentUserId } from '../auth/auth-slice.js';
import { loadTeamRoster, loadTeams, persistTeam, savePlayerToTeamRoster } from './team-storage.js';

const FIELD_OWNER = 'owner_uid';
const FIELD_PUBLIC = 'public';
const KEY_TEAMID = 'teamId';

const debugTeam = debug('team');

// Caches the currently selected team, for return visits.
function cacheTeamId(teamId: string) {
  idb.set(KEY_TEAMID, teamId).then();
}

export const getTeams = createAsyncThunk<
  // Return type of the payload creator
  { teams: Teams, selectedTeamId?: string },
  // First argument to the payload creator
  string | undefined,
  {
    // Optional fields for defining thunkApi field types
    // dispatch: AppDispatch
    state: RootState
  }
>(
  'team/getTeams',
  async (selectedTeamId, thunkAPI) => {
    // Show the user's teams, when signed in. Otherwise, only show public data.
    // TODO: Extract into helper function somewhere?
    const currentUserId = selectCurrentUserId(thunkAPI.getState());
    let teamFilter: CollectionFilter;
    if (currentUserId) {
      debugTeam(`Get teams for owner = ${currentUserId}, selected = ${selectedTeamId}`);
      teamFilter = whereFilter(FIELD_OWNER, '==', currentUserId);

      let teamId;
      if (!selectedTeamId) {
        teamId = selectCurrentTeamId(thunkAPI.getState());
      }
      if (!selectedTeamId && !teamId) {
        // No team id selected, which happens on initial load. Check for a
        // cached team id from previous visits.
        debugTeam('No team selected');
        const value = await idb.get(KEY_TEAMID);
        debugTeam('Done idb lookup for cached team id');
        if (value) {
          selectedTeamId = value as string;
        }
      }
    } else {
      debugTeam(`Get public teams, selected = ${selectedTeamId}`);
      teamFilter = whereFilter(FIELD_PUBLIC, '==', true);
    }

    debugTeam(`Get docs for teams, cachedTeamId = ${selectedTeamId!}`);

    const teams = await loadTeams(teamFilter);
    return { teams, selectedTeamId };
  }
);

export const addNewTeam = (newTeam: Team): ThunkResult => (dispatch, getState) => {
  if (!newTeam) {
    return;
  }
  const state = getState();
  // Verify that the team name is unique.
  const teamState = state.team!;
  if (teamState.teams) {
    const hasMatch = Object.keys(teamState.teams).some((key) => {
      const team = teamState.teams[key];
      return (team.name.localeCompare(newTeam.name, undefined, { sensitivity: 'base' }) == 0);
    });
    if (hasMatch) {
      return;
    }
  }
  dispatch(saveTeam(newTeam));
};

export const saveTeam = (newTeam: Team): ThunkResult => (dispatch, getState) => {
  // Save the team to Firestore, before adding to the store.
  persistTeam(newTeam, getState());
  cacheTeamId(newTeam.id);
  dispatch(addTeam(newTeam));
};

export const getRoster = createAsyncThunk(
  'team/getRoster',
  async (teamId: string, _thunkAPI) => {
    return loadTeamRoster(teamId);
  },
  {
    condition: (teamId) => {
      if (!teamId) {
        return false;
      }
      return true;
    },
  }
);

export const addNewPlayer = (newPlayer: Player): ThunkResult => (dispatch, getState) => {
  if (!newPlayer) {
    return;
  }
  const state = getState();
  // Verify that the player id is unique.
  const teamState = state.team!;
  if (teamState.roster && teamState.roster[newPlayer.id]) {
    return;
  }
  dispatch(savePlayer(newPlayer));
};

export const savePlayer = (newPlayer: Player): ThunkResult => (dispatch, getState) => {
  // Save the player to Firestore, before adding to the store.
  const teamId = selectCurrentTeamId(getState())!;
  savePlayerToTeamRoster(newPlayer, teamId);
  dispatch(addPlayer(newPlayer));
};

export interface TeamState {
  teams: Teams;
  teamsLoaded: boolean;
  teamsLoading: boolean;
  teamId: string;
  roster: Roster;
  error?: string;
}

const INITIAL_STATE: TeamState = {
  teams: {},
  teamsLoaded: false,
  teamsLoading: false,
  teamId: '',
  roster: {},
  error: ''
};

const teamSlice = createSlice({
  name: 'team',
  initialState: INITIAL_STATE,
  reducers: {
    addTeam: (state, action: PayloadAction<Team>) => {
      const team = action.payload;
      state.teams[team.id] = team;
      setCurrentTeam(state, team.id);
    },

    changeTeam: {
      reducer: (state, action: PayloadAction<{ teamId: string, teamName: string }>) => {
        setCurrentTeam(state, action.payload.teamId);
      },
      prepare: (teamId: string, teamName: string) => {
        return { payload: { teamId, teamName } };
      }
    },

    addPlayer: (state, action: PayloadAction<Player>) => {
      const player = action.payload;
      state.roster[player.id] = player;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(getTeams.pending, (state) => {
      state.teamsLoading = true;
      state.teamsLoaded = false;
    });
    builder.addCase(getTeams.fulfilled, (state, action) => {
      state.teamsLoading = false;
      state.teamsLoaded = true;
      state.teams = action.payload.teams;
      const selectedTeamId = action.payload.selectedTeamId;
      if (!state.teamId && selectedTeamId && state.teams[selectedTeamId]) {
        setCurrentTeam(state, selectedTeamId);
      }
    });
    builder.addCase(getRoster.fulfilled, (state, action) => {
      state.roster = action.payload!;
    });
  },
});

const { actions, reducer } = teamSlice;

export const team = reducer;
export const { addTeam, changeTeam, addPlayer } = actions;

function setCurrentTeam(state: TeamState, teamId: string) {
  if (state.teamId === teamId) {
    return;
  }
  const team = state.teams[teamId];
  if (!team) {
    return;
  }
  state.teamId = team.id;
}

export const currentTeamIdSelector = (state: RootState) => state.team && state.team.teamId;

export const selectCurrentTeamId = (state: RootState) => state.team?.teamId;

export const selectTeamsLoaded = (state: RootState) => state.team?.teamsLoaded;
