/** @format */

import { Duration } from '../../models/clock.js';
import { FormationBuilder, getPositions } from '../../models/formation.js';
import { LiveGame, LivePlayer, PeriodStatus, getPlayer } from '../../models/live.js';
import { PlayerStatus } from '../../models/player.js';
import { ThunkResult } from '../../store.js';
import { isPeriodOverdue } from './clock-reducer-logic.js';
import { extractIdFromSwapPlayerId } from './live-action-types.js';
import { actions, selectLiveGameById, selectPendingSubs } from './live-slice.js';

const {
  applyPendingSubs,
  endPeriod,
  invalidPendingSubs,
  invalidStarters,
  markPeriodOverdue,
  startersCompleted,
} = actions;

export const markPeriodOverdueCreator =
  (gameId: string): ThunkResult =>
  (dispatch, getState) => {
    const game = selectLiveGameById(getState(), gameId);
    if (!isPeriodOverdue(game)) {
      return;
    }
    dispatch(markPeriodOverdue(gameId));
  };

export const endPeriodCreator =
  (gameId: string, extraMinutes?: number): ThunkResult =>
  (dispatch, getState) => {
    const state = getState();
    const game = selectLiveGameById(state, gameId);
    if (!game) {
      return;
    }
    let retroactiveStopTime;
    if (
      (extraMinutes || extraMinutes === 0) &&
      game.clock?.periodStatus === PeriodStatus.Overdue &&
      game.clock.timer?.isRunning
    ) {
      const actualLength = game.clock.periodLength + extraMinutes;
      retroactiveStopTime = Duration.addToDate(
        game.clock.timer!.startTime!,
        Duration.create(actualLength * 60)
      );
    }
    dispatch(endPeriod(game.id, retroactiveStopTime));
  };

export const pendingSubsAppliedCreator =
  (gameId: string, selectedOnly?: boolean): ThunkResult =>
  (dispatch, getState) => {
    const state = getState();
    const game = selectLiveGameById(state, gameId);
    if (!game) {
      return;
    }
    const subs = selectPendingSubs(state, game.id, selectedOnly, /* includeSwaps */ true);
    if (!subs) {
      return;
    }
    const invalidSubs = validatePendingSubs(game, subs);
    if (invalidSubs.size) {
      dispatch(invalidPendingSubs(game.id, Array.from(invalidSubs.keys()).sort()));
      return;
    }
    dispatch(applyPendingSubs(game.id, subs, selectedOnly));
  };

export const startersCompletedCreator =
  (gameId: string): ThunkResult =>
  (dispatch, getState) => {
    const state = getState();
    const game = selectLiveGameById(state, gameId);
    if (!game) {
      return;
    }
    const invalidPositions = validateStarters(game);
    if (invalidPositions.size) {
      dispatch(invalidStarters(game.id, Array.from(invalidPositions.keys()).sort()));
      return;
    }
    dispatch(startersCompleted(game.id));
  };

function validatePendingSubs(game: LiveGame, subs: LivePlayer[]) {
  const seenNextIds = new Map<string, string>();
  const seenReplacedIds = new Map<string, string>();
  const invalidSubs = new Map<string, string>();

  const filledPositions = new FilledPositionMap(game.players!);

  for (const sub of subs) {
    if (sub.isSwap) {
      if (!sub.nextPosition) {
        invalidSubs.set(sub.id, 'missing next position for swap');
        continue;
      }
      if (!filledPositions.has(sub.nextPosition!.id)) {
        invalidSubs.set(
          sub.id,
          `swap into position that doesn't exist in formation: ${sub.nextPosition!.id}`
        );
        continue;
      }

      // Apply the swap:
      //  - Removing the filled position for the swap player's current position.
      //  - Adding to the filled position for the new position.
      filledPositions.removePlayer(sub.currentPosition!.id, sub.id);
      filledPositions.addPlayer(sub.nextPosition!.id, sub.id);
      continue;
    }
    if (!sub.replaces) {
      invalidSubs.set(sub.id, 'missing replaced player for sub');
      continue;
    }
    const existingReplacedId = seenReplacedIds.get(sub.replaces);
    if (existingReplacedId && existingReplacedId !== sub.id) {
      invalidSubs.set(sub.id, `two subs for player: ${sub.replaces}`);
      continue;
    }
    const replacedPlayer = getPlayer(game, sub.replaces);
    if (!replacedPlayer) {
      invalidSubs.set(sub.id, `player not found for replaces: ${sub.replaces}`);
      continue;
    }
    const existingNextId = seenNextIds.get(sub.id);
    if (existingNextId) {
      invalidSubs.set(sub.id, `player subbing on twice`);
      continue;
    }
    seenNextIds.set(sub.id, sub.replaces);
    seenReplacedIds.set(sub.replaces, sub.id);

    // Apply the sub:
    //  - Removing the filled position for the player to be replaced.
    //  - Adding to the filled position for the next player.
    filledPositions.removePlayer(replacedPlayer.currentPosition!.id, sub.replaces);
    filledPositions.addPlayer(sub.currentPosition!.id, sub.id);
  }

  const invalidPositions = validateFilledPositions(game, filledPositions);
  if (invalidPositions.size) {
    for (const invalid of invalidPositions) {
      invalidSubs.set(invalid[0], invalid[1]);
    }
  }
  return invalidSubs;
}

function validateStarters(game: LiveGame) {
  const filledPositions = new FilledPositionMap(game.players!);
  const invalidPositions = validateFilledPositions(game, filledPositions);
  return invalidPositions;
}

function validateFilledPositions(game: LiveGame, filledPositions: FilledPositionMap) {
  const invalidPositions = new Map<string, string>();

  for (const filled of filledPositions) {
    const position = filled[0];
    const ids = filled[1];
    if (ids.length !== 1) {
      invalidPositions.set(
        position,
        `Position [${position}] should have 1 id, instead has ${ids.length}`
      );
    }
  }

  const formation = FormationBuilder.create(game.formation?.type!);
  const requiredPositions = getPositions(formation);

  if (filledPositions?.size !== requiredPositions.length) {
    for (const position of requiredPositions) {
      if (!filledPositions.has(position.id)) {
        invalidPositions.set(position.id, `Position [${position.id}] is empty`);
      }
    }
  }

  return invalidPositions;
}

export class FilledPositionMap {
  private filled: Map<string, string[]>;

  constructor(protected players: LivePlayer[]) {
    this.filled = players.reduce((result, player) => {
      if (player.status === PlayerStatus.On) {
        const ids = result.get(player.currentPosition!.id) || [];
        ids.push(player.id);
        result.set(player.currentPosition!.id, ids);
      }
      return result;
    }, new Map<string, string[]>());
  }

  get size(): number {
    return this.filled.size;
  }

  has(positionId: string): boolean {
    return this.filled.has(positionId);
  }

  [Symbol.iterator]() {
    return this.filled.entries();
  }

  removePlayer(positionId: string, playerId: string) {
    const lookupPlayerId = extractIdFromSwapPlayerId(playerId);
    const { idsInPosition, playerIdIndex } = this.getIdsInPosition(positionId, lookupPlayerId);

    if (playerIdIndex >= 0) {
      idsInPosition!.splice(playerIdIndex, 1);
      this.filled.set(positionId, idsInPosition!);
    }
  }

  addPlayer(positionId: string, playerId: string) {
    const lookupPlayerId = extractIdFromSwapPlayerId(playerId);
    // eslint-disable-next-line prefer-const
    let { idsInPosition, playerIdIndex } = this.getIdsInPosition(positionId, lookupPlayerId);

    if (playerIdIndex < 0) {
      idsInPosition = idsInPosition || [];
      idsInPosition.push(playerId);
      this.filled.set(positionId, idsInPosition!);
    }
  }

  toJSON() {
    return Array.from(this.filled.entries());
  }

  private getIdsInPosition(positionId: string, playerId: string) {
    const idsInPosition = this.filled.get(positionId);
    const playerIdIndex = idsInPosition ? idsInPosition.indexOf(playerId) : -1;
    return { idsInPosition, playerIdIndex };
  }
}
