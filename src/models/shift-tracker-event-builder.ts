/** @format */

import { CurrentTimeProvider } from './clock.js';
import { GameEvent, GameEventType, LiveGame } from './live.js';
import { PlayerTimeTrackerMap } from './shift.js';

export function createShiftTrackerFromEvents(
  game: LiveGame,
  events: GameEvent[],
  timeProvider?: CurrentTimeProvider
) {
  const trackerMap = PlayerTimeTrackerMap.createFromGame(game, timeProvider);
  for (const event of events) {
    evolve(trackerMap, event);
  }
  return trackerMap;
}

function evolve(trackerMap: PlayerTimeTrackerMap, event: GameEvent) {
  switch (event.type) {
    case GameEventType.PeriodStart:
      trackerMap.startShiftTimers(event.data.clock.startTime);
      break;

    case GameEventType.PeriodEnd:
      trackerMap.stopShiftTimers(event.data.clock.endTime);
      break;

    case GameEventType.SubIn:
      console.log(`sub event: ${JSON.stringify(event)}`);
      trackerMap.substitutePlayer(event.playerId, event.data.replaced, event.timestamp);
      break;

    case GameEventType.Setup:
    case GameEventType.SubOut:
    case GameEventType.Swap:
    default:
    // No-op
    /*
    case 'ShoppingCartOpened':
      if (currentState.status != 'Empty') return currentState;

      return {
        id: event.data.shoppingCartId,
        clientId: event.data.clientId,
        productItems: [],
        status: 'Pending',
      };
    case 'ProductItemAddedToShoppingCart':
      if (currentState.status != 'Pending') return currentState;

      return {
        ...currentState,
        productItems: addProductItem(currentState.productItems, event.data.productItem),
      };
    case 'ProductItemRemovedFromShoppingCart':
      if (currentState.status != 'Pending') return currentState;

      return {
        ...currentState,
        productItems: removeProductItem(currentState.productItems, event.data.productItem),
      };
    case 'ShoppingCartConfirmed':
      if (currentState.status != 'Pending') return currentState;

      return {
        ...currentState,
        status: 'Confirmed',
        confirmedAt: new Date(event.data.confirmedAt),
      };
    case 'ShoppingCartCanceled':
      if (currentState.status != 'Pending') return currentState;

      return {
        ...currentState,
        status: 'Canceled',
        canceledAt: new Date(event.data.canceledAt),
      };
    default: {
      const _: never = event;
      return currentState;
    }
    */
  }
}
