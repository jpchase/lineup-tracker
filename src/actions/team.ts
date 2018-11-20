/**
@license
*/

import { Action, ActionCreator } from 'redux';
import { ThunkAction } from 'redux-thunk';
import { RootState } from '../store.js';
import { Roster } from '../models/roster.js';
export const GET_ROSTER = 'GET_ROSTER';

export interface TeamActionGetRoster extends Action<'GET_ROSTER'> {roster: Roster};
export type TeamAction = TeamActionGetRoster;

type ThunkResult = ThunkAction<void, RootState, undefined, TeamAction>;

const TEAM_U16A = [
  {id: 1, name: 'Allie', uniformNumber: 16, positions: ['CB'],
   status: 'OFF'},
  {id: 2, name: 'Amanda', uniformNumber: 2, positions: ['CB', 'FB', 'HM'],
   status: 'OFF'},
  {id: 3, name: 'Emma F', uniformNumber: 42, positions: ['AM', 'HM', 'OM'],
   status: 'OFF'},
  {id: 4, name: 'Emma H', uniformNumber: 4, positions: ['AM', 'HM'],
   status: 'OFF'},
  {id: 5, name: 'Emmalene', uniformNumber: 22, positions: ['FB', 'OM'],
   status: 'OFF'},
  {id: 6, name: 'Jill', uniformNumber: 28, positions: ['AM', 'OM', 'S'],
   status: 'OFF'},
  {id: 7, name: 'Kiana', uniformNumber: 13, positions: ['S', 'OM'],
   status: 'OFF'},
  {id: 8, name: 'Lauren', uniformNumber: 8, positions: ['AM', 'OM', 'S'],
   status: 'OFF'},
  {id: 9, name: 'Leah', uniformNumber: 44, positions: ['OM', 'S'],
   status: 'OFF'},
  {id: 10, name: 'Ryley', uniformNumber: 19, positions: ['GK'],
   status: 'OFF'},
  {id: 11, name: 'Sophia', uniformNumber: 18, positions: ['FB', 'CB'],
   status: 'OFF'},
  {id: 12, name: 'Syd', uniformNumber: 5, positions: ['HM', 'AM'],
   status: 'OFF'},
  {id: 13, name: 'Val', uniformNumber: 27, positions: ['CB', 'HM'],
   status: 'OFF'},
  {id: 14, name: 'Thalia', uniformNumber: 9, positions: ['FB', 'OM'],
   status: 'OFF'},
  {id: 15, name: 'Teanna', uniformNumber: 77, positions: ['OM', 'FB'],
   status: 'OFF'},
];

export const getRoster: ActionCreator<ThunkResult> = () => (dispatch) => {
  // Here you would normally get the data from the server. We're simulating
  // that by dispatching an async action (that you would dispatch when you
  // succesfully got the data back)

  // You could reformat the data in the right format as well:
  const roster = TEAM_U16A.reduce((obj, player) => {
    obj[player.id] = player
    return obj
  }, {} as Roster);

  console.log(`getRoster - ActionCreator: ${JSON.stringify(roster)}`);

  dispatch({
    type: GET_ROSTER,
    roster
  });
};
