import { Action, ActionCreator, AnyAction } from 'redux';
import { ThunkAction } from 'redux-thunk';
import { Position } from '../models/formation';
import { LiveGame } from '../models/game';
import {
  APPLY_NEXT,
  APPLY_STARTER,
  CANCEL_STARTER,
  CANCEL_SUB,
  CONFIRM_SUB,
  DISCARD_NEXT,
  LIVE_HYDRATE,
  SELECT_PLAYER,
  SELECT_STARTER,
  SELECT_STARTER_POSITION
} from '../slices/live-types';
import { ClockState } from '../slices/live/clock-slice.js';
import { proposedSubSelector } from '../slices/live/live-slice.js';
import { RootState } from '../store';
export { toggle as toggleClock } from '../slices/live/clock-slice.js';

export interface LiveActionHydrate extends Action<typeof LIVE_HYDRATE> { gameId?: string, game?: LiveGame, clock?: ClockState };
export interface LiveActionApplyStarter extends Action<typeof APPLY_STARTER> { };
export interface LiveActionCancelStarter extends Action<typeof CANCEL_STARTER> { };
export interface LiveActionApplyNext extends Action<typeof APPLY_NEXT> { selectedOnly?: boolean };
export interface LiveActionDiscardNext extends Action<typeof DISCARD_NEXT> { selectedOnly?: boolean };
export interface LiveActionCancelSub extends Action<typeof CANCEL_SUB> { };
export interface LiveActionConfirmSub extends Action<typeof CONFIRM_SUB> { };
export interface LiveActionSelectPlayer extends Action<typeof SELECT_PLAYER> { playerId: string; selected: boolean };
export interface LiveActionSelectStarter extends Action<typeof SELECT_STARTER> { playerId: string; selected: boolean };
export interface LiveActionSelectStarterPosition extends Action<typeof SELECT_STARTER_POSITION> { position: Position };

type ThunkResult = ThunkAction<void, RootState, undefined, AnyAction>;

export const hydrateLive: ActionCreator<LiveActionHydrate> = (game: LiveGame, gameId?: string, clock?: ClockState) => {
  return {
    type: LIVE_HYDRATE,
    gameId,
    game,
    clock
  }
};

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

export const confirmProposedSub: ActionCreator<ThunkResult> = () => (dispatch, getState) => {
  if (!proposedSubSelector(getState())) {
    return;
  }
  dispatch({
    type: CONFIRM_SUB
  });
};

export const cancelProposedSub: ActionCreator<ThunkResult> = () => (dispatch, getState) => {
  if (!proposedSubSelector(getState())) {
    return;
  }
  dispatch({
    type: CANCEL_SUB
  });
};

export const applyPendingSubs: ActionCreator<ThunkResult> = (selectedOnly?: boolean) => (dispatch) => {
  dispatch({
    type: APPLY_NEXT,
    selectedOnly: !!selectedOnly
  });
};

export const discardPendingSubs: ActionCreator<ThunkResult> = (selectedOnly?: boolean) => (dispatch) => {
  dispatch({
    type: DISCARD_NEXT,
    selectedOnly: !!selectedOnly
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
