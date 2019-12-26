import { Action, ActionCreator } from 'redux';
import { ThunkAction } from 'redux-thunk';
import { SELECT_PLAYER } from '../slices/live-types';
import { RootState } from '../store';

export interface LiveActionSelectPlayer extends Action<typeof SELECT_PLAYER> { playerId: string };
export type LiveAction = LiveActionSelectPlayer;

type ThunkResult = ThunkAction<void, RootState, undefined, LiveAction>;

export const selectPlayer: ActionCreator<ThunkResult> = (playerId: string) => (dispatch) => {
  if (!playerId) {
    return;
  }
  dispatch({
    type: SELECT_PLAYER,
    playerId
  });
};
