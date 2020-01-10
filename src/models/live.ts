/**
@license
*/
import { Game, LiveGame, GameDetail, LivePlayer } from './game';

export class LiveGameBuilder {
  static create(game: Game): LiveGame {
    if (!game) {
      throw new Error(`Argument 'game' is missing or undefined`);
    }

    const liveGame: LiveGame = {
      id: game.id,
    };

    // Setup live players from roster
    const detail = game as GameDetail;
    if (detail.roster) {
      const players: LivePlayer[] = Object.keys(detail.roster).map((playerId) => {
        const player = detail.roster[playerId];
        return { ...player } as LivePlayer;
      });
      liveGame.players = players;
    }
    return liveGame;
  }
}

export function getPlayer(game: LiveGame, playerId: string) {
  if (!game || !game.players) {
    return;
  }
  return game.players.find(p => (p.id === playerId));
}
