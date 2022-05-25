import { LivePlayer } from '@app/models/game';
import { PlayerStatus } from '@app/models/player.js';
import { PlayerTimeTrackerData } from '@app/models/shift.js';

export function buildPlayerTrackers(players?: LivePlayer[]): PlayerTimeTrackerData[] {
  if (!players) {
    return [];
  }
  return players.reduce((result, player) => {
    result.push(buildPlayerTracker(player));
    return result;
  }, [] as PlayerTimeTrackerData[]);
}

export function buildPlayerTracker(player: LivePlayer): PlayerTimeTrackerData {
  const tracker: PlayerTimeTrackerData = {
    id: player.id,
    isOn: (player.status === PlayerStatus.On)
  };
  return tracker;
}
