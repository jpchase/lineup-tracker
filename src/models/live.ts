/**
@license
*/
import { FormationMetadata, Position } from './formation.js';
import { Game, GameDetail, GameStatus, SetupTask } from './game.js';
import { Player } from './player.js';

export enum PeriodStatus {
  Pending = 'PENDING',
  Running = 'RUNNING',
  Done = 'DONE'
}

export interface LivePlayer extends Player {
  currentPosition?: Position;
  replaces?: string;
  nextPosition?: Position;
  isSwap?: boolean;
  selected?: boolean;
}

export interface LiveGame {
  id: string;
  status: GameStatus;
  dataCaptured?: boolean;
  formation?: FormationMetadata;
  players?: LivePlayer[];
  setupTasks?: SetupTask[];
}

export interface LiveGames {
  [index: string]: LiveGame;
}

export class LiveGameBuilder {
  static create(game: Game): LiveGame {
    if (!game) {
      throw new Error(`Argument 'game' is missing or undefined`);
    }

    const liveGame: LiveGame = {
      id: game.id,
      status: game.status,
    };

    // Setup live players from roster
    const detail = game as GameDetail;
    if (detail.roster) {
      const players: LivePlayer[] = Object.keys(detail.roster).map((playerId) => {
        const player = detail.roster[playerId];
        return { ...player } as LivePlayer;
      });
      liveGame.players = players;
    }
    return liveGame;
  }
}

export function getPlayer(game: LiveGame, playerId: string) {
  if (!game || !game.players) {
    return;
  }
  return game.players.find(p => (p.id === playerId));
}

export function removePlayer(game: LiveGame, playerId: string) {
  if (!game?.players) {
    return false;
  }
  const index = game.players.findIndex(p => (p.id === playerId));
  if (index < 0) {
    return false;
  }
  game.players.splice(index, 1);
  return true;
}

export function gameCanStartPeriod(game: LiveGame, previousPeriod: number, totalPeriods: number): boolean {
  if (!(game.status === GameStatus.Start || game.status === GameStatus.Break)) {
    return false;
  }
  return previousPeriod < totalPeriods;
}
