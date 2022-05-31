/**
@license
*/

import { ThunkAction } from '@reduxjs/toolkit';
import { ActionCreator, AnyAction } from 'redux';
import { RootState } from '../../store.js';
import { applyPendingSubs, selectCurrentLiveGame, selectPendingSubs } from './live-slice.js';

//TODO: Figure out strong typing? Noticed that calls with invalid params aren't caught
export const pendingSubsAppliedCreator: ActionCreator<ThunkAction<void, RootState, undefined, AnyAction>> = (selectedOnly?: boolean) => (dispatch, getState) => {
  const state = getState();
  const game = selectCurrentLiveGame(state);
  if (!game) {
    return;
  }
  const subs = selectPendingSubs(state, selectedOnly);
  if (!subs) {
    return;
  }
  dispatch(applyPendingSubs(subs, selectedOnly));
};
