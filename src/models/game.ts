/**
@license
*/
import { FormationMetadata } from './formation';
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
  formation?: FormationMetadata;
  setupTasks?: SetupTask[];
}

export interface Games {
  [index: string]: Game;
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
