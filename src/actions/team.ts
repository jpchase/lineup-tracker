/**
@license
*/

import { Action, ActionCreator } from 'redux';
import { ThunkAction } from 'redux-thunk';
import { RootState } from '../store.js';
import { Roster, Team } from '../models/team.js';
export const GET_TEAMS = 'GET_TEAMS';
export const GET_ROSTER = 'GET_ROSTER';

export interface TeamActionGetTeams extends Action<'GET_TEAMS'> { teams: Team[] };
export interface TeamActionGetRoster extends Action<'GET_ROSTER'> { roster: Roster };
export type TeamAction = TeamActionGetTeams | TeamActionGetRoster;

type ThunkResult = ThunkAction<void, RootState, undefined, TeamAction>;

const TEAM_U16A = { id: 'U16A', name: 'Waterloo U16A' };

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
  const teams: Team[] = [TEAM_U16A];

  console.log(`getTeams - ActionCreator: ${JSON.stringify(teams)}`);

  dispatch({
    type: GET_TEAMS,
    teams
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
