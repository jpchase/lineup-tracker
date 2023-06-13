/** @format */

import { createContext } from '@lit-labs/context';
import { LivePlayer } from '../models/live.js';

export interface PlayerResolver {
  getPlayer(playerId: string): LivePlayer | undefined;
}

export const playerResolverContext = createContext<PlayerResolver>('player-resolver');
