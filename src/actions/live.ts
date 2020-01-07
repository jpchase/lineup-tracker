import { Action, ActionCreator } from 'redux';
import { ThunkAction } from 'redux-thunk';
import { Position } from '../models/formation';
import {
  APPLY_STARTER,
  CANCEL_STARTER,
  CANCEL_SUB,
  CONFIRM_SUB,
  SELECT_PLAYER,
  SELECT_STARTER,
  SELECT_STARTER_POSITION
} from '../slices/live-types';
import { RootState } from '../store';

export interface LiveActionApplyStarter extends Action<typeof APPLY_STARTER> {};
export interface LiveActionCancelStarter extends Action<typeof CANCEL_STARTER> {};
export interface LiveActionCancelSub extends Action<typeof CANCEL_SUB> {};
export interface LiveActionConfirmSub extends Action<typeof CONFIRM_SUB> {};
export interface LiveActionSelectPlayer extends Action<typeof SELECT_PLAYER> { playerId: string; selected: boolean };
export interface LiveActionSelectStarter extends Action<typeof SELECT_STARTER> { playerId: string; selected: boolean };
export interface LiveActionSelectStarterPosition extends Action<typeof SELECT_STARTER_POSITION> { position: Position };

export type LiveAction = LiveActionApplyStarter | LiveActionCancelStarter | LiveActionCancelSub | LiveActionConfirmSub | LiveActionSelectPlayer | LiveActionSelectStarter | LiveActionSelectStarterPosition;

type ThunkResult = ThunkAction<void, RootState, undefined, LiveAction>;

export const selectPlayer: ActionCreator<ThunkResult> = (playerId: string, selected: boolean) => (dispatch) => {
  if (!playerId) {
    return;
  }
  dispatch({
    type: SELECT_PLAYER,
    playerId,
    selected: !!selected
  });
};

export const selectStarter: ActionCreator<ThunkResult> = (playerId: string, selected: boolean) => (dispatch) => {
  if (!playerId) {
    return;
  }
  dispatch({
    type: SELECT_STARTER,
    playerId,
    selected: !!selected
  });
};

export const selectStarterPosition: ActionCreator<ThunkResult> = (position: Position) => (dispatch) => {
  if (!position) {
    return;
  }
  dispatch({
    type: SELECT_STARTER_POSITION,
    position
  });
};

export const applyProposedStarter: ActionCreator<ThunkResult> = () => (dispatch, getState) => {
  const state = getState();
  if (!(state.live && state.live.proposedStarter)) {
    return;
  }
  dispatch({
    type: APPLY_STARTER
  });
};

export const cancelProposedStarter: ActionCreator<ThunkResult> = () => (dispatch, getState) => {
  const state = getState();
  if (!(state.live && state.live.proposedStarter)) {
    return;
  }
  dispatch({
    type: CANCEL_STARTER
  });
};
