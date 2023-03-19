import { Player, Roster } from '../../models/player.js';

export interface GamePayload {
  gameId: string;
}

export interface RosterCopiedPayload extends GamePayload {
  gameRoster?: Roster;
}

export interface PlayerAddedPayload extends GamePayload {
  player: Player;
}

export const prepareGamePayload = (gameId: string) => {
  return {
    payload: {
      gameId,
    }
  };
}
