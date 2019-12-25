import { LivePlayer, LiveGame } from '@app/models/game';
import { Player } from '@app/models/player';
import { /* getStoredGame,*/ STORED_GAME_ID } from './test_data';

export function getLiveGame(players?: Player[] /*, status?: GameStatus */): LiveGame {
  return {
    id: STORED_GAME_ID,
    // ...getStoredGame(status),
    players: buildLivePlayers(players)
  };
}

export function buildLivePlayers(players?: Player[]): LivePlayer[] {
  if (!players) {
    return [];
  }
  return players.reduce((obj, player) => {
    obj.push(player);
    return obj;
  }, [] as LivePlayer[]);
}
