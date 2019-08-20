/**
@license
*/
import { FormationMetadata, Position } from './formation';
import { Player, Roster } from './player';

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
  formation?: FormationMetadata;
  liveDetail?: LiveGame;
}

export interface Games {
  [index: string]: Game;
}

export interface LiveGame {
  id: string;
  players?: LivePlayer[];
  setupTasks?: SetupTask[];
}

export enum SetupSteps {
  Formation,
  Roster,
  Captains,
  Starters
}

export enum SetupStatus {
  Pending,
  Active,
  InProgress,
  Complete
}

export interface SetupTask {
  step: SetupSteps;
  status: SetupStatus;
}

export interface LivePlayer extends Player {
  currentPosition?: Position;
}
