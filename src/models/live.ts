/** @format */

import { TimerData } from './clock.js';
import { EventBase, EventCollection, EventCollectionData } from './events.js';
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
  (v) => !Number.isNaN(Number(v)),
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
  stoppageTimer?: TimerData;
  gameStartDate?: number;
  currentPeriod: number;
  periodStartTime?: number;
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

// Game events
export enum GameEventType {
  PeriodStart = 'PERIODSTART',
  PeriodEnd = 'PERIODEND',
  Setup = 'SETUP',
  SubIn = 'SUBIN',
  SubOut = 'SUBOUT',
  Swap = 'SWAP',
  ClockToggle = 'CLOCKTOGGLE',
}

// Base game event types
export interface GameEventBase<
  EventType extends GameEventType = GameEventType,
  EventData extends Record<string, unknown> = Record<string, unknown>,
> extends EventBase<EventType, EventData> {}

export interface GamePlayerEventBase<
  EventType extends GameEventType = GameEventType,
  EventData extends Record<string, unknown> = Record<string, unknown>,
> extends GameEventBase<EventType, EventData> {
  playerId: string;
}

// Event-specific types

export interface SetupEventData extends Record<string, unknown> {
  clock: {
    periodLength: number;
    totalPeriods: number;
  };
  starters: {
    id: string;
    position: string;
  }[];
}
export interface SetupEvent extends GameEventBase<GameEventType.Setup, SetupEventData> {}

export interface PeriodStartEventData extends Record<string, unknown> {
  clock: {
    currentPeriod: number;
    startTime: number;
  };
}
export interface PeriodStartEvent
  extends GameEventBase<GameEventType.PeriodStart, PeriodStartEventData> {}

export interface PeriodEndEventData extends Record<string, unknown> {
  clock: {
    currentPeriod: number;
    endTime: number;
  };
}
export interface PeriodEndEvent
  extends GameEventBase<GameEventType.PeriodEnd, PeriodEndEventData> {}

export interface ClockToggleEventData extends Record<string, unknown> {
  clock: {
    // Whether the clock is running after it was toggled.
    isRunning: boolean;
  };
}
export interface ClockToggleEvent
  extends GameEventBase<GameEventType.ClockToggle, ClockToggleEventData> {}

export interface SubInEventData extends Record<string, unknown> {
  replaced: string;
  position: string;
}
export interface SubInEvent extends GamePlayerEventBase<GameEventType.SubIn, SubInEventData> {}

export interface SubOutEventData extends Record<string, unknown> {
  // Data is empty
}
export interface SubOutEvent extends GamePlayerEventBase<GameEventType.SubOut, SubOutEventData> {}

export interface PositionSwapEventData extends Record<string, unknown> {
  position: string;
  previousPosition: string;
}
export interface PositionSwapEvent
  extends GamePlayerEventBase<GameEventType.Swap, PositionSwapEventData> {}

export type GamePlayerEvent = SubInEvent | SubOutEvent | PositionSwapEvent;

export type GameEvent =
  | ClockToggleEvent
  | PeriodStartEvent
  | PeriodEndEvent
  | SetupEvent
  | GamePlayerEvent;

export interface GameEventGroup {
  groupedEvents: GameEvent[];
}

export type GameEventCollection = EventCollection<GameEvent>;
export type GameEventCollectionData = EventCollectionData<GameEvent>;

export function isGamePlayerEvent(event: GameEvent): event is GamePlayerEvent {
  switch (event.type) {
    case GameEventType.SubIn:
    case GameEventType.SubOut:
    case GameEventType.Swap:
      return true;
    case GameEventType.ClockToggle:
    case GameEventType.PeriodEnd:
    case GameEventType.PeriodStart:
    case GameEventType.Setup:
      return false;
    default: {
      const _exhaustiveCheck: never = event;
      return _exhaustiveCheck;
    }
  }
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
      stoppageTimer: undefined,
      gameStartDate: undefined,
      currentPeriod: 0,
      periodStartTime: undefined,
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
  includeSwaps?: boolean,
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
