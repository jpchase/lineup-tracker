/** @format */
import { gameSlice } from './game-slice.js';

export {
  addNewGame,
  addNewGamePlayer,
  copyRoster,
  gameSetupCompletedCreator,
  getGame,
  getGameSliceConfigurator,
  getGames,
  selectGameById,
  selectGameRosterLoading,
} from './game-slice.js';

// Only export actions that can be used directly, i.e. do not have a creator/wrapper.
//  - See export above for creator functions.
export const { addGame, gamePlayerAdded } = gameSlice.actions;
