/**
@license
*/

import { Action, ActionCreator } from 'redux';
import { ThunkAction } from 'redux-thunk';
import { RootState } from '../store';
import { Player, Roster } from '../models/player';
import { Team, Teams } from '../models/team';
import { firebaseRef } from '../firebase';
import { buildNewDocumentData } from '../firestore-helpers';
import { CollectionReference, DocumentData, DocumentReference, Query, QuerySnapshot, QueryDocumentSnapshot } from '@firebase/firestore-types';

export const ADD_TEAM = 'ADD_TEAM';
export const CHANGE_TEAM = 'CHANGE_TEAM';
export const GET_TEAMS = 'GET_TEAMS';
export const GET_ROSTER = 'GET_ROSTER';
export const ADD_PLAYER = 'ADD_PLAYER';

export interface TeamActionAddTeam extends Action<'ADD_TEAM'> { team: Team };
export interface TeamActionChangeTeam extends Action<'CHANGE_TEAM'> { teamId: string };
export interface TeamActionGetTeams extends Action<'GET_TEAMS'> { teams: Teams };
export interface TeamActionGetRoster extends Action<'GET_ROSTER'> { roster: Roster };
export interface TeamActionAddPlayer extends Action<'ADD_PLAYER'> { player: Player };
export type TeamAction = TeamActionAddTeam | TeamActionChangeTeam | TeamActionGetTeams | TeamActionGetRoster | TeamActionAddPlayer;

type ThunkResult = ThunkAction<void, RootState, undefined, TeamAction>;

const KEY_TEAMS = 'teams';
const KEY_ROSTER = 'roster';
const FIELD_OWNER = 'owner_uid';
const FIELD_PUBLIC = 'public';

function getTeamsCollection(): CollectionReference {
  return firebaseRef.firestore().collection(KEY_TEAMS);
}

export const getTeams: ActionCreator<ThunkResult> = () => (dispatch, getState) => {
  // TODO: Add try/catch for firestore/collection/get calls?
  let query: Query = getTeamsCollection();
  // Show the user's teams, when signed in. Otherwise, only show public data.
  // TODO: Extract into helper function somewhere?
  const currentUser = getState().auth!.user;
  if (currentUser && currentUser.id) {
      console.log(`Get teams for owner = ${JSON.stringify(currentUser)}`);
    query = query.where(FIELD_OWNER, '==', currentUser.id);
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
      teams
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

// Saves the new team in local storage, before adding to the store
export const saveTeam: ActionCreator<ThunkResult> = (newTeam: Team) => (dispatch, getState) => {
    const data = buildNewDocumentData(newTeam, getState());

    const collection = getTeamsCollection();
    const doc: DocumentReference = collection.doc();
    doc.set(data);

    newTeam.id = doc.id;
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
  // TODO: Add try/catch for firestore/collection/get calls?
  firebaseRef.firestore().collection(`${KEY_TEAMS}/${teamId}/${KEY_ROSTER}`).get().then((value: QuerySnapshot) => {
    const roster = {} as Roster;

    value.forEach((result: QueryDocumentSnapshot) => {
      const data: DocumentData = result.data();
      const player: Player = {
        id: result.id,
        name: data.name,
        uniformNumber: data.uniformNumber,
        positions: data.positions,
        status: data.status
      };
      roster[player.id] = player;
    });

    console.log(`getRoster - ActionCreator: ${JSON.stringify(roster)}`);

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

// Saves the new player in local storage, before adding to the store
export const savePlayer: ActionCreator<ThunkResult> = (newPlayer: Player) => (dispatch /*, getState*/) => {
  // TODO: Duplicating logic here from that in reducers to add player to state?
  // const teamState = getState().team;
  // const roster = (teamState && teamState.roster) ? teamState.roster : {};

  // roster[newPlayer.id] = newPlayer;

  // set(KEY_ROSTER, roster).then(() => {
    dispatch(addPlayer(newPlayer));
  // }).catch((error: any) => {
  //   console.log(`Storage of ${newPlayer} failed: ${error}`);
  // });
};

export const addPlayer: ActionCreator<ThunkResult> = (player: Player) => (dispatch) => {
  dispatch({
    type: ADD_PLAYER,
    player
  });
};
