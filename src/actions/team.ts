/**
@license
*/

import { Action, ActionCreator } from 'redux';
import { ThunkAction } from 'redux-thunk';
import { RootState } from '../store';
import { Player, Roster } from '../models/player';
import { Team, Teams } from '../models/team';
import { currentTeamIdSelector } from '../reducers/team';
import { firebaseRef } from '../firebase';
import { saveNewDocument, loadTeamRoster, savePlayerToTeamRoster, KEY_TEAMS } from '../firestore-helpers';
import { CollectionReference, DocumentData, Query, QuerySnapshot, QueryDocumentSnapshot } from '@firebase/firestore-types';
import { get, set } from 'idb-keyval';

import {
  ADD_TEAM,
  CHANGE_TEAM,
  ADD_PLAYER,
  GET_ROSTER,
  GET_TEAMS
} from './team-types';

export interface TeamActionAddTeam extends Action<typeof ADD_TEAM> { team: Team };
export interface TeamActionChangeTeam extends Action<typeof CHANGE_TEAM> { teamId: string };
export interface TeamActionGetTeams extends Action<typeof GET_TEAMS> { teams: Teams, cachedTeamId?: string };
export interface TeamActionGetRoster extends Action<typeof GET_ROSTER> { roster: Roster };
export interface TeamActionAddPlayer extends Action<typeof ADD_PLAYER> { player: Player };
export type TeamAction = TeamActionAddTeam | TeamActionChangeTeam | TeamActionGetTeams | TeamActionGetRoster | TeamActionAddPlayer;

type ThunkResult = ThunkAction<void, RootState, undefined, TeamAction>;

const FIELD_OWNER = 'owner_uid';
const FIELD_PUBLIC = 'public';
const KEY_TEAMID = 'teamId';

function getTeamsCollection(): CollectionReference {
  return firebaseRef.firestore().collection(KEY_TEAMS);
}

// Caches the currently selected team, for return visits.
function cacheTeamId(teamId: string) {
  set(KEY_TEAMID, teamId).then();
}

export const getTeams: ActionCreator<ThunkResult> = () => (dispatch, getState) => {
  // TODO: Add try/catch for firestore/collection/get calls?
  let query: Query = getTeamsCollection();
  // Show the user's teams, when signed in. Otherwise, only show public data.
  // TODO: Extract into helper function somewhere?
  const currentUser = getState().auth!.user;
  let cachedTeamId: string;
  if (currentUser && currentUser.id) {
    console.log(`Get teams for owner = ${JSON.stringify(currentUser)}`);
    query = query.where(FIELD_OWNER, '==', currentUser.id);

    const teamId = currentTeamIdSelector(getState());
    if (!teamId) {
      // No team id selected, which happens on initial load. Check for a
      // cached team id from previous visits.
      get(KEY_TEAMID).then((value) => {
        if (value) {
          cachedTeamId = value as string;
        }
      });
    }
  } else {
    console.log(`Get public teams`);
    query = query.where(FIELD_PUBLIC, '==', true);
  }

  query.get().then((value: QuerySnapshot) => {
    const teams = {} as Teams;

    value.forEach((result: QueryDocumentSnapshot) => {
      const data: DocumentData = result.data();
      const entry: Team = {
        id: result.id,
        name: data.name
      };
      teams[entry.id] = entry;
    });

    console.log(`getTeams - ActionCreator: ${JSON.stringify(teams)}`);

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
      return (team.name.localeCompare(newTeam.name, undefined, {sensitivity: 'base'}) == 0);
    });
    if (hasMatch) {
      return;
    }
  }
  dispatch(saveTeam(newTeam));
};

export const saveTeam: ActionCreator<ThunkResult> = (newTeam: Team) => (dispatch, getState) => {
  // Save the team to Firestore, before adding to the store.
  saveNewDocument(newTeam, getTeamsCollection(), getState(), { addUserId: true });
  cacheTeamId(newTeam.id);
  dispatch(addTeam(newTeam));
};

export const addTeam: ActionCreator<ThunkResult> = (team: Team) => (dispatch) => {
  dispatch({
    type: ADD_TEAM,
    team
  });
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
