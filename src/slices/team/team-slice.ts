/**
@license
*/

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ActionCreator, AnyAction } from 'redux';
import { ThunkAction } from 'redux-thunk';
import { debug } from '../../common/debug.js';
import { Player, Roster } from '../../models/player.js';
import { Team, Teams } from '../../models/team.js';
import { currentUserIdSelector } from '../../reducers/auth.js';
import { CollectionFilter, whereFilter } from '../../storage/firestore-reader.js';
import { idb } from '../../storage/idb-wrapper.js';
import { RootState } from '../../store.js';
import { loadTeamRoster, loadTeams, persistTeam, savePlayerToTeamRoster } from './team-storage.js';

type ThunkResult = ThunkAction<void, RootState, undefined, AnyAction>;

const FIELD_OWNER = 'owner_uid';
const FIELD_PUBLIC = 'public';
const KEY_TEAMID = 'teamId';

const debugTeam = debug('team');

// Caches the currently selected team, for return visits.
function cacheTeamId(teamId: string) {
  idb.set(KEY_TEAMID, teamId).then();
}

export const getTeams: ActionCreator<ThunkResult> = (selectedTeamId?: string) => (dispatch, getState) => {
  // Show the user's teams, when signed in. Otherwise, only show public data.
  // TODO: Extract into helper function somewhere?
  const currentUserId = currentUserIdSelector(getState());
  let cachedTeamId: string;
  let teamFilter: CollectionFilter;
  if (currentUserId) {
    debugTeam(`Get teams for owner = ${currentUserId}, selected = ${selectedTeamId}`);
    teamFilter = whereFilter(FIELD_OWNER, '==', currentUserId);

    const teamId = currentTeamIdSelector(getState());
    if (!teamId) {
      // No team id selected, which happens on initial load. Check for a
      // cached team id from previous visits.
      debugTeam('No team selected');
      idb.get(KEY_TEAMID).then((value) => {
        debugTeam('Done idb lookup for cached team id');
        if (value) {
          cachedTeamId = value as string;
        }
      });
    }
  } else {
    debugTeam(`Get public teams, selected = ${selectedTeamId}`);
    teamFilter = whereFilter(FIELD_PUBLIC, '==', true);
  }

  debugTeam(`Get docs for teams, cachedTeamId = ${cachedTeamId!}`);
  loadTeams(teamFilter).then((teams) => {
    // Override the team to be selected, only if provided.
    if (selectedTeamId) {
      cachedTeamId = selectedTeamId;
    }

    dispatch(actions.getTeams(
      teams,
      cachedTeamId
    ));

  }).catch((error: any) => {
    // TODO: Dispatch error?
    console.log(`Loading of teams from storage failed: ${error}`);
  });
};

export const addNewTeam: ActionCreator<ThunkResult> = (newTeam: Team) => (dispatch, getState) => {
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

export const saveTeam: ActionCreator<ThunkResult> = (newTeam: Team) => (dispatch, getState) => {
  // Save the team to Firestore, before adding to the store.
  persistTeam(newTeam, getState());
  cacheTeamId(newTeam.id);
  dispatch(addTeam(newTeam));
};

export const getRoster: ActionCreator<ThunkResult> = (teamId: string) => (dispatch) => {
  if (!teamId) {
    return;
  }
  loadTeamRoster(teamId).then((roster) => {
    dispatch(actions.getRoster(
      roster
    ));

  }).catch((error: any) => {
    // TODO: Dispatch error?
    console.log(`Loading of roster from storage failed: ${error}`);
  });

};

export const addNewPlayer: ActionCreator<ThunkResult> = (newPlayer: Player) => (dispatch, getState) => {
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

export const savePlayer: ActionCreator<ThunkResult> = (newPlayer: Player) => (dispatch, getState) => {
  // Save the player to Firestore, before adding to the store.
  const teamId = currentTeamIdSelector(getState())!;
  savePlayerToTeamRoster(newPlayer, teamId);
  dispatch(addPlayer(newPlayer));
};

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
export const { addTeam, changeTeam, addPlayer } = actions;

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
