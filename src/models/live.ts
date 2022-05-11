/**
@license
*/
import { Game, LiveGame, GameDetail, LivePlayer, GameStatus } from './game';

export enum PeriodStatus {
  Pending = 'PENDING',
  Running = 'RUNNING',
  Done = 'DONE'
}

export class LiveGameBuilder {
  static create(game: Game): LiveGame {
    if (!game) {
      throw new Error(`Argument 'game' is missing or undefined`);
    }

    const liveGame: LiveGame = {
      id: game.id,
      status: game.status,
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

export function gameCanStartPeriod(game: LiveGame): boolean {
  return (game.status === GameStatus.Start || game.status === GameStatus.Break);
}
