/**
@license
*/
import { Action } from "redux";

export const SELECT_PLAYER = 'SELECT_PLAYER';
export const CONFIRM_SUB = 'CONFIRM_SUB';
export const CANCEL_SUB = 'CANCEL_SUB';
export const APPLY_NEXT = 'APPLY_NEXT';
export const DISCARD_NEXT = 'DISCARD_NEXT';
export const SELECT_STARTER = 'SELECT_STARTER';
export const SELECT_STARTER_POSITION = 'SELECT_STARTER_POSITION';
export const APPLY_STARTER = 'APPLY_STARTER';
export const CANCEL_STARTER = 'CANCEL_STARTER';
export const START_PERIOD = 'START_PERIOD';
export const END_PERIOD = 'END_PERIOD';
export const TOGGLE_CLOCK = 'TOGGLE_CLOCK';

export interface LiveActionStartPeriod extends Action<typeof START_PERIOD> {};
export interface LiveActionEndPeriod extends Action<typeof END_PERIOD> {};
export interface LiveActionToggleClock extends Action<typeof TOGGLE_CLOCK> {};
