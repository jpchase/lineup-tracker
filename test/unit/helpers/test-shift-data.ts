/** @format */

import { LiveGame, LivePlayer } from '@app/models/live.js';
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
    isOn: player.status === PlayerStatus.On,
  };
  return tracker;
}

export function buildPlayerTrackerMap(
  gameId: string,
  existingPlayers?: LivePlayer[],
  keepExistingStatus?: boolean
) {
  let players;
  if (existingPlayers) {
    players = existingPlayers;
  } else {
    players = testlive.getLivePlayers(18);
  }
  if (!keepExistingStatus) {
    players.forEach((player, index) => {
      // Set the first 11 players to be On, the last player to be Out, and the
      // remaining players to be Off.
      let status = PlayerStatus.Off;
      if (index < 11) {
        status = PlayerStatus.On;
      } else if (index === 17) {
        status = PlayerStatus.Out;
      }
      player.status = status;
    });
  }
  const game = { id: gameId || 'thegameid', players } as LiveGame;
  return PlayerTimeTrackerMap.createFromGame(game);
}
