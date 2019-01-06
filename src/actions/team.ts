/**
@license
*/

import { Action, ActionCreator } from 'redux';
import { ThunkAction } from 'redux-thunk';
import { RootState } from '../store.js';
import { Roster, Team, Teams } from '../models/team.js';
import { get, set } from 'idb-keyval';

export const ADD_TEAM = 'ADD_TEAM';
export const GET_TEAMS = 'GET_TEAMS';
export const GET_ROSTER = 'GET_ROSTER';

export interface TeamActionAddTeam extends Action<'ADD_TEAM'> { team: Team };
export interface TeamActionGetTeams extends Action<'GET_TEAMS'> { teams: Teams };
export interface TeamActionGetRoster extends Action<'GET_ROSTER'> { roster: Roster };
export type TeamAction = TeamActionAddTeam | TeamActionGetTeams | TeamActionGetRoster;

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
  get(KEY_TEAMS).then((value) => {
    const teams: Teams = (value ? value : {}) as Teams;

    console.log(`getTeams - ActionCreator: ${JSON.stringify(teams)}`);

    dispatch({
      type: GET_TEAMS,
      teams
    });

  }).catch((error: any) => {
    console.log(`Loading of teams from storage failed: ${error}`);
  });
};

export const addNewTeam: ActionCreator<ThunkResult> = (newTeam: Team) => (dispatch, getState) => {
  if (!newTeam) {
    return;
  }
  const state = getState();
  // Verify that the team id is unique.
  const teamState = state.team!;
  if (teamState.teams && teamState.teams[newTeam.id]) {
    return;
  }
  dispatch(saveTeam(newTeam));
};

// Saves the new team in local storage, before adding to the store
export const saveTeam: ActionCreator<ThunkResult> = (newTeam: Team) => (dispatch, getState) => {
  // TODO: Duplicating logic here from that in reducers to add team to state?
  const teamState = getState().team;
  const teams = (teamState && teamState.teams) ? teamState.teams : {};

  teams[newTeam.id] = newTeam;

  set(KEY_TEAMS, teams).then(() => {
    dispatch(addTeam(newTeam));
  }).catch((error: any) => {
    console.log(`Storage of ${newTeam} failed: ${error}`);
  });
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
