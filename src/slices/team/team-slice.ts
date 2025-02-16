/** @format */

import { createAsyncThunk, createSlice, PayloadAction, type WithSlice } from '@reduxjs/toolkit';
import { buildSliceConfigurator, SliceConfigurator } from '../../middleware/slice-configurator.js';
import { Player, Roster } from '../../models/player.js';
import { Team, Teams } from '../../models/team.js';
import { CollectionFilter, whereFilter } from '../../storage/firestore-reader.js';
import { RootState, ThunkPromise, ThunkResult } from '../../store.js';
import { logger } from '../../util/logger.js';
import { selectCurrentTeam } from '../app/app-slice.js';
import { selectCurrentUserId } from '../auth/auth-slice.js';
import { loadTeamRoster, loadTeams, persistTeam, savePlayerToTeamRoster } from './team-storage.js';

const FIELD_OWNER = 'owner_uid';
const FIELD_PUBLIC = 'public';

const debugTeam = logger('team');

export const getTeams = createAsyncThunk<
  // Return type of the payload creator
  { teams: Teams },
  // First argument to the payload creator
  // Unused, but required to allow the type of the state to be specified
  void,
  {
    // Optional fields for defining thunkApi field types
    // dispatch: AppDispatch
    state: RootState;
  }
>('team/getTeams', async (_unused, thunkAPI) => {
  // Show the user's teams, when signed in. Otherwise, only show public data.
  // TODO: Extract into helper function somewhere?
  const currentUserId = selectCurrentUserId(thunkAPI.getState());
  let teamFilter: CollectionFilter;
  if (currentUserId) {
    debugTeam(`Get teams for owner = ${currentUserId}`);
    teamFilter = whereFilter(FIELD_OWNER, '==', currentUserId);
  } else {
    debugTeam(`Get public teams`);
    teamFilter = whereFilter(FIELD_PUBLIC, '==', true);
  }

  debugTeam(`Get docs for teams`);

  const teams = await loadTeams(teamFilter);
  return { teams };
});

export const addNewTeam =
  (newTeam: Team): ThunkPromise<void> =>
  async (dispatch, getState) => {
    if (!newTeam) {
      return;
    }
    const state = getState();
    // Verify that the team name is unique.
    const teamState = state.team!;
    if (teamState.teams) {
      const hasMatch = Object.keys(teamState.teams).some((key) => {
        const team = teamState.teams[key];
        return team.name.localeCompare(newTeam.name, undefined, { sensitivity: 'base' }) === 0;
      });
      if (hasMatch) {
        return;
      }
    }
    await dispatch(saveTeam(newTeam));
  };

export const saveTeam =
  (newTeam: Team): ThunkPromise<void> =>
  async (dispatch, getState) => {
    // Save the team to Firestore, before adding to the store.
    await persistTeam(newTeam, getState());
    dispatch(teamSlice.actions.addTeam(newTeam));
  };

export const getRoster = createAsyncThunk<
  // Return type of the payload creator.
  Roster,
  // The teamId is the first argument to the payload creator.
  string,
  {
    // Optional fields for defining thunkApi field types
    state: RootState;
    // The team id is added to the meta for the pending action.
    pendingMeta: { teamId: string };
  }
>(
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
    getPendingMeta: (base) => {
      return { teamId: base.arg };
    },
  },
);

export const addNewPlayer =
  (newPlayer: Player): ThunkResult =>
  (dispatch, getState) => {
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

export const savePlayer =
  (newPlayer: Player): ThunkPromise<void> =>
  async (dispatch, getState) => {
    // Save the player to Firestore, before adding to the store.
    const teamId = selectCurrentTeam(getState())?.id!;
    await savePlayerToTeamRoster(newPlayer, teamId);
    dispatch(teamSlice.actions.addPlayer(newPlayer));
  };

export interface TeamState {
  teams: Teams;
  teamsLoaded: boolean;
  teamsLoading: boolean;
  roster: Roster;
  rosterLoaded: boolean;
  rosterLoading: boolean;
  error?: string;
}

export const TEAM_INITIAL_STATE: TeamState = {
  teams: {},
  teamsLoaded: false,
  teamsLoading: false,
  roster: {},
  rosterLoaded: false,
  rosterLoading: false,
  error: '',
};

export const teamSlice = createSlice({
  name: 'team',
  initialState: TEAM_INITIAL_STATE,
  reducers: {
    addTeam: (state, action: PayloadAction<Team>) => {
      const team = action.payload;
      state.teams[team.id] = team;
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
    });
    builder.addCase(getRoster.pending, (state) => {
      state.rosterLoading = true;
      state.rosterLoaded = false;
    });
    builder.addCase(getRoster.fulfilled, (state, action) => {
      state.rosterLoading = false;
      state.rosterLoaded = true;
      state.roster = action.payload!;
    });
  },
  // TODO: Can use this once can use `slice.injectInto`, to obtain selectors
  // from the injected slice. e.g.
  // export const { selectTeamsLoaded, selectTeamRoster, selectTeamRosterLoaded } = injectedTeamSlice.selectors;
  // This doesn't work when using rootReducer.inject() because the selectors below
  // expect the team state to be non-optional (causes type errors)
  /*
  selectors: {
    selectTeamsLoaded: (state) => state.teamsLoaded,
    selectTeamRoster: (state) => state.roster,
    selectTeamRosterLoaded: (state) => state.rosterLoaded,
  },
  */
});

// Extend the root state typings with this slice.
//  - The module "name" is actually the relative path to interface definition.
declare module '../reducer' {
  export interface LazyLoadedSlices extends WithSlice<typeof teamSlice> {}
}

export function getTeamSliceConfigurator(): SliceConfigurator {
  return buildSliceConfigurator(teamSlice);
}

export const { actions } = teamSlice;
export const { addTeam } = teamSlice.actions;

export const selectTeamsLoaded = (state: RootState) => state.team?.teamsLoaded;

export const selectTeamRoster = (state: RootState) => state.team?.roster;

export const selectTeamRosterLoaded = (state: RootState) => state.team?.rosterLoaded;
