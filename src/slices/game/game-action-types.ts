import { Roster } from '../../models/player.js';

export interface GamePayload {
  gameId: string;
}

export interface RosterCopiedPayload extends GamePayload {
  gameRoster?: Roster;
}

export const prepareGamePayload = (gameId: string) => {
  return {
    payload: {
      gameId,
    }
  };
}
