import { LivePlayer } from "@app/models/game.js";
import { createContext } from "./context.js";

class EmptyResolver implements PlayerResolver {
  getPlayer(_playerId: string): LivePlayer | undefined {
    return;
  }
}

export interface PlayerResolver {
  getPlayer(playerId: string): LivePlayer | undefined;
}

export const playerResolverContext = createContext<PlayerResolver>('player-resolver', new EmptyResolver());
