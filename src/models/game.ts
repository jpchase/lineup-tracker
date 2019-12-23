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
  // TODO: Move formation to LiveGame
  formation?: FormationMetadata;
  // TODO: Remove when separate reducer/actions implemented
  liveDetail?: LiveGame;
}

export interface Games {
  [index: string]: Game;
}

// TODO: Move all the live game/setup stuff to separate model file?
export interface LiveGame {
  id: string;
  formation?: FormationMetadata;
  players?: LivePlayer[];
  setupTasks?: SetupTask[];
}

export class LiveGameBuilder {
  static create(game: Game): LiveGame {
    if (!game) {
      throw new Error(`Argument 'game' is missing or undefined`);
    }

    const liveGame: LiveGame = {
      id: game.id,
    };

    // Setup live players from roster
    if (game.hasDetail) {
      const detail = game as GameDetail;
      const players: LivePlayer[] = Object.keys(detail.roster).map((playerId) => {
        const player = detail.roster[playerId];
        return { ...player } as LivePlayer;
      });
      liveGame.players = players;
    }
    return liveGame;
  }
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
