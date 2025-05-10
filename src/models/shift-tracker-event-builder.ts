/** @format */

import { exhaustiveGuard } from '../util/shared-types.js';
import { CurrentTimeProvider } from './clock.js';
import { GameEvent, GameEventType, LiveGame } from './live.js';
import { PlayerTimeTrackerMap } from './shift.js';

export function createShiftTrackerFromEvents(
  game: LiveGame,
  events: Iterable<GameEvent>,
  timeProvider?: CurrentTimeProvider,
) {
  // Ensure that the events are replayed in order they occurred.
  const sortedEvents = [...events];
  sortedEvents.sort((a: GameEvent, b: GameEvent) => {
    return a.timestamp! - b.timestamp!;
  });
  const trackerMap = PlayerTimeTrackerMap.createFromGame(game, timeProvider);
  for (const event of sortedEvents) {
    evolve(trackerMap, event);
  }
  return trackerMap;
}

function evolve(trackerMap: PlayerTimeTrackerMap, event: GameEvent) {
  switch (event.type) {
    case GameEventType.Setup:
      trackerMap.setStarters(event.data.starters);
      break;

    case GameEventType.PeriodStart:
      trackerMap.startShiftTimers(event.data.clock.startTime);
      break;

    case GameEventType.PeriodEnd:
      trackerMap.stopShiftTimers(event.data.clock.endTime);
      break;

    case GameEventType.ClockToggle:
      // The event has the state of the clock *after* the toggle happened.
      if (event.data.clock.isRunning) {
        trackerMap.startShiftTimers(event.timestamp);
      } else {
        trackerMap.stopShiftTimers(event.timestamp);
      }
      break;

    case GameEventType.SubIn:
      trackerMap.substitutePlayer(event.playerId, event.data.replaced, event.timestamp);
      break;

    case GameEventType.SubOut:
    case GameEventType.Swap:
      // No-op, these events do not affect shift timing.
      break;

    default:
      exhaustiveGuard(event);
  }
}
