import { LivePlayer } from '@app/models/game';
import { PlayerStatus } from '@app/models/player.js';
import { PlayerTimeTrackerData, PlayerTimeTrackerMap } from '@app/models/shift.js';
import * as testlive from './test-live-game-data.js';

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

export function buildPlayerTrackerMap(existingPlayers?: LivePlayer[],
  keepExistingStatus?: boolean) {
  let players;
  if (existingPlayers) {
    players = existingPlayers.slice(0);
  } else {
    players = testlive.getLivePlayers(18);
  }
  if (!keepExistingStatus) {
    players.forEach((player, index) => {
      player.status = (index < 11) ? PlayerStatus.On : PlayerStatus.Off;
    });
  }
  return new PlayerTimeTrackerMap().initialize(players);
}
