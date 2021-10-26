/**
@license
*/

import { DocumentData } from 'firebase/firestore';
import { Action, ActionCreator } from 'redux';
import { ThunkAction } from 'redux-thunk';
import { debug } from '../common/debug';
import { firebaseRef } from '../firebase.js';
import { KEY_TEAMS, loadTeamRoster, savePlayerToTeamRoster } from '../firestore-helpers';
import { Player, Roster } from '../models/player';
import { Team, Teams } from '../models/team';
import { currentUserIdSelector } from '../reducers/auth.js';
import { addTeam, currentTeamIdSelector } from '../reducers/team';
import {
  ADD_PLAYER, ADD_TEAM,
  CHANGE_TEAM, GET_ROSTER,
  GET_TEAMS
} from '../slices/team-types';
import { CollectionFilter, reader, whereFilter } from '../storage/firestore-reader.js';
import { writer } from '../storage/firestore-writer.js';
import { idb } from '../storage/idb-wrapper';
import { ModelConverter } from '../storage/model-converter.js';
import { RootState } from '../store';

export { addTeam } from '../reducers/team';

export interface TeamActionAddTeam extends Action<typeof ADD_TEAM> { payload: Team };
export interface TeamActionChangeTeam extends Action<typeof CHANGE_TEAM> { teamId: string };
export interface TeamActionGetTeams extends Action<typeof GET_TEAMS> { teams: Teams, cachedTeamId?: string };
export interface TeamActionGetRoster extends Action<typeof GET_ROSTER> { roster: Roster };
export interface TeamActionAddPlayer extends Action<typeof ADD_PLAYER> { player: Player };
export type TeamAction = TeamActionAddTeam | TeamActionChangeTeam | TeamActionGetTeams | TeamActionGetRoster | TeamActionAddPlayer;

type ThunkResult = ThunkAction<void, RootState, undefined, TeamAction>;

const FIELD_OWNER = 'owner_uid';
const FIELD_PUBLIC = 'public';
const KEY_TEAMID = 'teamId';

const debugTeam = debug('team');

const teamConverter: ModelConverter<Team> =
{
  fromDocument: (id: string, data: DocumentData) => {
    return { id, name: data.name };
  }
};

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
  reader.loadCollection<Team, Teams>(KEY_TEAMS, teamConverter, teamFilter).then((teams) => {
    // Override the team to be selected, only if provided.
    if (selectedTeamId) {
      cachedTeamId = selectedTeamId;
    }

    dispatch({
      type: GET_TEAMS,
      teams,
      cachedTeamId
    });

  }).catch((error: any) => {
    // TODO: Dispatch error?
    console.log(`Loading of teams from storage failed: ${error}`);
  });
};

export const changeTeam: ActionCreator<ThunkResult> = (teamId: string) => (dispatch, getState) => {
  if (!teamId) {
    return;
  }
  const state = getState();
  // Verify that the team id exists.
  const teamState = state.team!;
  if (!teamState.teams || !teamState.teams[teamId]) {
    return;
  }
  // Only change if different from the current team.
  if (teamState.teamId === teamId) {
    return;
  }
  cacheTeamId(teamId);
  dispatch({
    type: CHANGE_TEAM,
    teamId
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
  writer.saveNewDocument(newTeam, KEY_TEAMS, getState(), { addUserId: true });
  cacheTeamId(newTeam.id);
  dispatch(addTeam(newTeam));
};

export const getRoster: ActionCreator<ThunkResult> = (teamId: string) => (dispatch) => {
  if (!teamId) {
    return;
  }
  loadTeamRoster(firebaseRef.firestore(), teamId).then((roster: Roster) => {
    dispatch({
      type: GET_ROSTER,
      roster
    });

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
  savePlayerToTeamRoster(newPlayer, firebaseRef.firestore(), teamId);
  dispatch(addPlayer(newPlayer));
};

export const addPlayer: ActionCreator<ThunkResult> = (player: Player) => (dispatch) => {
  dispatch({
    type: ADD_PLAYER,
    player
  });
};
