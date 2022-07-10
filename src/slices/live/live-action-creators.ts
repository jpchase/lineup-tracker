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
import { applyPendingSubs, invalidPendingSubs, selectCurrentLiveGame, selectPendingSubs } from './live-slice.js';

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
    dispatch(invalidPendingSubs(game.id, Array.from(invalidSubs.keys())));
    return;
  }
  dispatch(applyPendingSubs(game.id, subs, selectedOnly));
};

function replacer(_key: any, value: any) {
  if (value instanceof Map) {
    return {
      dataType: 'Map',
      value: Array.from(value.entries()), // or with spread: value: [...value]
    };
  } else {
    return value;
  }
}

function validatePendingSubs(game: LiveGame, subs: LivePlayer[]) {
  const seenNextIds = new Map<string, string>();
  const seenReplacedIds = new Map<string, string>();
  const invalidSubs = new Map<string, string>();

  const formation = FormationBuilder.create(game.formation?.type!);
  const requiredPositions = getPositions(formation);
  const filledPositions = new FilledPositionMap(game.players!);

  if (filledPositions?.size !== requiredPositions.length) {
    console.log(`Invalid positions for current On players`);
  }
  console.log(`before, subs = ${JSON.stringify(subs)} filledPositions = ${JSON.stringify(filledPositions)}`)

  for (const sub of subs) {
    console.log(`sub: ${JSON.stringify(sub)}, next = ${seenNextIds.size}, ${JSON.stringify(seenNextIds, replacer)}, replaced = ${seenReplacedIds.size}, ${JSON.stringify(seenReplacedIds, replacer)}`);
    console.log(`invalidSubs = ${JSON.stringify(invalidSubs, replacer)}`)
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
      console.log(`swap - after filledPositions = ${JSON.stringify(filledPositions)}`)
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
    console.log(`valid sub: ${sub.id}, next = ${seenNextIds.size}, replaced = ${seenReplacedIds.size},`);

    // Apply the sub:
    //  - Removing the filled position for the player to be replaced.
    //  - Adding to the filled position for the next player.
    filledPositions.removePlayer(replacedPlayer.currentPosition!.id, sub.replaces);
    filledPositions.addPlayer(sub.currentPosition!.id, sub.id);
    console.log(`sub - after filledPositions = ${JSON.stringify(filledPositions)}`)
  }

  console.log(`all subs/swaps: invalidSubs = ${JSON.stringify(invalidSubs, replacer)}, filledPositions = ${JSON.stringify(filledPositions)}`)

  for (const filled of filledPositions) {
    const position = filled[0];
    const ids = filled[1];
    if (ids.length !== 1) {
      console.log(`Filled check wrong: ${JSON.stringify(filled)}`);
      invalidSubs.set(position, `Position [${position}] should have 1 id, instead as ${ids.length}`);
    }
  }
  return invalidSubs;
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
    console.log(`Removing ${playerId} from ${positionId}: ${JSON.stringify(idsInPosition)}, ${playerIdIndex}`);

    if (playerIdIndex >= 0) {
      idsInPosition!.splice(playerIdIndex, 1);
      this.filled.set(positionId, idsInPosition!);
    }
  }

  addPlayer(positionId: string, playerId: string) {
    playerId = extractIdFromSwapPlayerId(playerId);
    let { idsInPosition, playerIdIndex } = this.getIdsInPosition(positionId, playerId);
    console.log(`Adding ${playerId} to ${positionId}: ${JSON.stringify(idsInPosition)}, ${playerIdIndex}`);

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
