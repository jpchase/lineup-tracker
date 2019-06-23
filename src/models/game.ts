/**
@license
*/
import { Roster } from './player';

export interface GameMetadata {
  name: string;
  date: Date;
  opponent: string;
}

export enum GameStatus {
  New = 'NEW',
  Start = 'START',
  Live = 'LIVE',
  Break = 'BREAK',
  Done = 'DONE'
}

export interface Game extends GameMetadata {
  id: string;
  teamId: string;
  status: GameStatus;
  hasDetail?: boolean;
}

export interface GameDetail extends Game {
  roster: Roster;
  formation?: Formation;
}

export interface Games {
  [index: string]: Game;
}

export enum FormationType {
  F4_3_3 = '4-3-3',
}

export interface Formation {
  type: FormationType;
}
