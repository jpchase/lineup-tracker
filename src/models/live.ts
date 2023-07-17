/** @format */

import { TimerData } from './clock.js';
import { EventBase } from './events.js';
import { FormationMetadata, Position } from './formation.js';
import { Game, GameDetail, GameStatus } from './game.js';
import { Player, PlayerStatus } from './player.js';

export enum PeriodStatus {
  Pending = 'PENDING',
  Running = 'RUNNING',
  Overdue = 'OVERDUE',
  Done = 'DONE',
}

export enum SetupStatus {
  Pending,
  Active,
  InProgress,
  Complete,
}

export enum SetupSteps {
  Roster,
  Formation,
  Starters,
  Periods,
  Captains,
}

export const AllSetupSteps: SetupSteps[] = Object.values(SetupSteps).filter(
  (v) => !Number.isNaN(Number(v))
) as SetupSteps[];

export interface SetupTask {
  step: SetupSteps;
  status: SetupStatus;
}

export interface LivePlayer extends Player {
  currentPosition?: Position;
  replaces?: string;
  nextPosition?: Position;
  isSwap?: boolean;
  selected?: boolean;
}

export interface LiveClock {
  timer?: TimerData;
  currentPeriod: number;
  periodStatus: PeriodStatus;
  totalPeriods: number;
  periodLength: number;
}

export interface LiveGame {
  id: string;
  status: GameStatus;
  dataCaptured?: boolean;
  clock?: LiveClock;
  formation?: FormationMetadata;
  players?: LivePlayer[];
  setupTasks?: SetupTask[];
}

export interface LiveGames {
  [index: string]: LiveGame;
}

export enum GameEventType {
  Setup = 'SETUP',
  StartPeriod = 'STARTPERIOD',
  SubIn = 'SUBIN',
  SubOut = 'SUBOUT',
  Swap = 'SWAP',
}

export interface GameEvent extends EventBase<GameEventType> {
  playerId?: string;
}

export interface GameEventGroup {
  groupedEvents: GameEvent[];
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

    // Setup live players from roster.
    const detail = game as GameDetail;
    if (detail.roster) {
      const players: LivePlayer[] = Object.keys(detail.roster).map((playerId) => {
        const player = detail.roster[playerId];
        return { ...player } as LivePlayer;
      });
      liveGame.players = players;
    }

    // Initialize clock to default values.
    liveGame.clock = this.createClock();

    return liveGame;
  }

  static createClock(): LiveClock {
    return {
      timer: undefined,
      currentPeriod: 0,
      periodStatus: PeriodStatus.Pending,
      totalPeriods: 2,
      periodLength: 45,
    };
  }
}

export function findPlayersByStatus(
  game: LiveGame,
  status: PlayerStatus,
  selectedOnly?: boolean,
  includeSwaps?: boolean
) {
  const matches: LivePlayer[] = [];
  game.players!.forEach((player) => {
    if (player.status !== status) {
      return;
    }
    if (selectedOnly && !player.selected) {
      return;
    }
    if (!includeSwaps && player.isSwap) {
      return;
    }

    matches.push(player);
  });
  return matches;
}

export function getPlayer(game: LiveGame, playerId: string) {
  if (!game || !game.players) {
    return undefined;
  }
  return game.players.find((p) => p.id === playerId);
}

export function removePlayer(game: LiveGame, playerId: string) {
  if (!game?.players) {
    return false;
  }
  const index = game.players.findIndex((p) => p.id === playerId);
  if (index < 0) {
    return false;
  }
  game.players.splice(index, 1);
  return true;
}
