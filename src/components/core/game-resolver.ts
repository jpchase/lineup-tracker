/** @format */

import { createContext } from '@lit/context';
import { GameMetadata } from '../../models/game.js';

export interface GameResolver {
  getCurrentGame(): GameMetadata | undefined;
}

export const gameResolverContext = createContext<GameResolver>('game-resolver');
