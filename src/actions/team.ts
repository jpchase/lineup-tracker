/**
@license
*/

import { Action, ActionCreator } from 'redux';
import { ThunkAction } from 'redux-thunk';
import { RootState } from '../store.js';
import { Player, Roster, Team, Teams } from '../models/team.js';
import { firebaseRef } from "../firebase";
import { DocumentData, DocumentReference, QuerySnapshot, QueryDocumentSnapshot } from '@firebase/firestore-types';

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

const ROSTER_U16A = [
  {id: 'AB', name: 'Allie', uniformNumber: 16, positions: ['CB'],
   status: 'OFF'},
  {id: 'AC', name: 'Amanda', uniformNumber: 2, positions: ['CB', 'FB', 'HM'],
   status: 'OFF'},
  {id: 'EF', name: 'Emma F', uniformNumber: 42, positions: ['AM', 'HM', 'OM'],
   status: 'OFF'},
  {id: 'EH', name: 'Emma H', uniformNumber: 4, positions: ['AM', 'HM'],
   status: 'OFF'},
  {id: 'EC', name: 'Emmalene', uniformNumber: 22, positions: ['FB', 'OM'],
   status: 'OFF'},
  {id: 'JG', name: 'Jill', uniformNumber: 28, positions: ['AM', 'OM', 'S'],
   status: 'OFF'},
  {id: 'KS', name: 'Kiana', uniformNumber: 13, positions: ['S', 'OM'],
   status: 'OFF'},
  {id: 'LT', name: 'Lauren', uniformNumber: 8, positions: ['AM', 'OM', 'S'],
   status: 'OFF'},
  {id: 'LH', name: 'Leah', uniformNumber: 44, positions: ['OM', 'S'],
   status: 'OFF'},
  {id: 'RW', name: 'Ryley', uniformNumber: 19, positions: ['GK'],
   status: 'OFF'},
  {id: 'SR', name: 'Sophia', uniformNumber: 18, positions: ['FB', 'CB'],
   status: 'OFF'},
  {id: 'SS', name: 'Syd', uniformNumber: 5, positions: ['HM', 'AM'],
   status: 'OFF'},
  {id: 'VR', name: 'Val', uniformNumber: 27, positions: ['CB', 'HM'],
   status: 'OFF'},
  {id: 'TC', name: 'Thalia', uniformNumber: 9, positions: ['FB', 'OM'],
   status: 'OFF'},
  {id: 'TA', name: 'Teanna', uniformNumber: 77, positions: ['OM', 'FB'],
   status: 'OFF'},
];

export const getTeams: ActionCreator<ThunkResult> = () => (dispatch) => {
  // Here you would normally get the data from the server. We're simulating
  // that by dispatching an async action (that you would dispatch when you
  // succesfully got the data back)

  // You could reformat the data in the right format as well:
  // TODO: Add try/catch for firestore/collection/get calls?
  firebaseRef.firestore().collection(KEY_TEAMS).get().then((value: QuerySnapshot) => {
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
export const saveTeam: ActionCreator<ThunkResult> = (newTeam: Team) => (dispatch) => {
    const collection = firebaseRef.firestore().collection(KEY_TEAMS);
    const doc: DocumentReference = collection.doc();
    console.log(`blank doc added: ${doc.id}`);
    doc.set(newTeam);
    newTeam.id = doc.id;
    dispatch(addTeam(newTeam));
    console.log('dispatch done');
};

export const addTeam: ActionCreator<ThunkResult> = (team: Team) => (dispatch) => {
  dispatch({
    type: ADD_TEAM,
    team
  });
};

export const getRoster: ActionCreator<ThunkResult> = () => (dispatch) => {
  // Here you would normally get the data from the server. We're simulating
  // that by dispatching an async action (that you would dispatch when you
  // succesfully got the data back)

  // You could reformat the data in the right format as well:
  const roster = ROSTER_U16A.reduce((obj, player) => {
    obj[player.id] = player
    return obj
  }, {} as Roster);

  console.log(`getRoster - ActionCreator: ${JSON.stringify(roster)}`);

  dispatch({
    type: GET_ROSTER,
    roster
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
