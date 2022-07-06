/**
@license
*/

import { ThunkAction } from '@reduxjs/toolkit';
import { AnyAction } from 'redux';
import { FormationBuilder, getPositions } from '../../models/formation.js';
import { getPlayer, LiveGame, LivePlayer } from '../../models/live.js';
import { PlayerStatus } from '../../models/player.js';
import { RootState } from '../../store.js';
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
    dispatch(invalidPendingSubs([]));
    return;
  }
  dispatch(applyPendingSubs(subs, selectedOnly));
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
  const filledPositions =
    game.players!.reduce((result, player) => {
      if (player.status === PlayerStatus.On) {
        const ids = result.get(player.currentPosition!.id) || [];
        ids.push(player.id);
        result.set(player.currentPosition!.id, ids);
      }
      return result;
    }, new Map<string, string[]>());

  if (filledPositions?.size !== requiredPositions.length) {
    console.log(`Invalid positions for current On players`);
  }
  console.log(`before, subs = ${JSON.stringify(subs)} filledPositions = ${JSON.stringify(filledPositions, replacer)}`)

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

      const replacedIds = filledPositions.get(sub.currentPosition!.id);
      const replacedIndex = replacedIds ? replacedIds?.indexOf(sub.id) : -1;

      console.log(`Swap old position: ${JSON.stringify(replacedIds)}, ${replacedIndex}`)
      if (replacedIndex >= 0) {
        replacedIds!.splice(replacedIndex, 1);
        filledPositions.set(sub.currentPosition!.id, replacedIds!);
      }

      let newIds = filledPositions.get(sub.nextPosition!.id);
      const newIndex = newIds ? newIds?.indexOf(sub.id) : -1;

      console.log(`newIds: ${JSON.stringify(newIds)}, ${newIndex}`)

      if (newIndex < 0) {
        newIds = newIds || [];
        newIds.push(sub.id);
        filledPositions.set(sub.nextPosition!.id, newIds!);
      }
      console.log(`swap - after filledPositions = ${JSON.stringify(filledPositions, replacer)}`)
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

    // Apply the sub, depending
    //  - Removing the filled position for the player to be replaced
    //  - Adding to the filled position for the next player
    const replacedIds = filledPositions.get(replacedPlayer.currentPosition!.id);
    const replacedIndex = replacedIds ? replacedIds?.indexOf(sub.replaces) : -1;

    console.log(`Replaced: ${JSON.stringify(replacedIds)}, ${replacedIndex}`)
    if (replacedIndex >= 0) {
      replacedIds!.splice(replacedIndex, 1);
      filledPositions.set(replacedPlayer.currentPosition!.id, replacedIds!);
    }

    let newIds = filledPositions.get(sub.currentPosition!.id);
    const newIndex = newIds ? newIds?.indexOf(sub.replaces) : -1;

    console.log(`newIds: ${JSON.stringify(newIds)}, ${newIndex}`)

    if (newIndex < 0) {
      newIds = newIds || [];
      newIds.push(sub.id);
      filledPositions.set(sub.currentPosition!.id, newIds!);
    }
    console.log(`sub - after filledPositions = ${JSON.stringify(filledPositions, replacer)}`)
  }

  console.log(`all subs/swaps: invalidSubs = ${JSON.stringify(invalidSubs, replacer)}, filledPositions = ${JSON.stringify(filledPositions, replacer)}`)

  for (const filled of filledPositions) {
    const position = filled[0];
    const ids = filled[1];
    if (ids.length !== 1) {
      console.log(`Filled check wrong: ${JSON.stringify(filled)}`);
      invalidSubs.set(position, `Position [${JSON.stringify(position)}] should have 1 id, instead as ${ids.length}`);
    }
  }
  return invalidSubs;
}
