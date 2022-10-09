/**
@license
*/

import { ThunkAction } from '@reduxjs/toolkit';
import { AnyAction } from 'redux';
import { FormationBuilder, getPositions } from '../../models/formation.js';
import { getPlayer, LiveGame, LivePlayer } from '../../models/live.js';
import { PlayerStatus } from '../../models/player.js';
import { RootState } from '../../store.js';
import { extractIdFromSwapPlayerId } from './live-action-types.js';
import { applyPendingSubs, invalidPendingSubs, invalidStarters, selectCurrentLiveGame, selectLiveGameById, selectPendingSubs, startersCompleted } from './live-slice.js';

export const pendingSubsAppliedCreator = (selectedOnly?: boolean): ThunkAction<void, RootState, undefined, AnyAction> => (dispatch, getState) => {
  const state = getState();
  const game = selectCurrentLiveGame(state);
  if (!game) {
    return;
  }
  const subs = selectPendingSubs(state, selectedOnly, /* includeSwaps */true);
  if (!subs) {
    console.log('No subs!')
    return;
  }
  const invalidSubs = validatePendingSubs(game, subs);
  if (invalidSubs.size) {
    dispatch(invalidPendingSubs(game.id, Array.from(invalidSubs.keys()).sort()));
    return;
  }
  dispatch(applyPendingSubs(game.id, subs, selectedOnly));
};

export const startersCompletedCreator = (gameId: string): ThunkAction<void, RootState, undefined, AnyAction> => (dispatch, getState) => {
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
        continue
      }
      if (!filledPositions.has(sub.nextPosition!.id)) {
        invalidSubs.set(sub.id, `swap into position that doesn't exist in formation: ${sub.nextPosition!.id}`);
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
    if (existingReplacedId && existingReplacedId != sub.id) {
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
      invalidPositions.set(position, `Position [${position}] should have 1 id, instead has ${ids.length}`);
    }
  }

  const formation = FormationBuilder.create(game.formation?.type!);
  const requiredPositions = getPositions(formation);

  if (filledPositions?.size !== requiredPositions.length) {
    console.log(`Formation has unfilled positions with current On players`);
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
    playerId = extractIdFromSwapPlayerId(playerId);
    const { idsInPosition, playerIdIndex } = this.getIdsInPosition(positionId, playerId);

    if (playerIdIndex >= 0) {
      idsInPosition!.splice(playerIdIndex, 1);
      this.filled.set(positionId, idsInPosition!);
    }
  }

  addPlayer(positionId: string, playerId: string) {
    playerId = extractIdFromSwapPlayerId(playerId);
    let { idsInPosition, playerIdIndex } = this.getIdsInPosition(positionId, playerId);

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
    let idsInPosition = this.filled.get(positionId);
    const playerIdIndex = idsInPosition ? idsInPosition.indexOf(playerId) : -1;
    return { idsInPosition, playerIdIndex };
  }
}
