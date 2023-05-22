/** @format */

import { liveSlice } from './live-slice.js';

export {
  endPeriodCreator,
  markPeriodOverdueCreator,
  pendingSubsAppliedCreator,
  startersCompletedCreator,
} from './live-action-creators.js';
export {
  LiveState,
  live,
  rosterCompleted,
  selectInvalidStarters,
  selectInvalidSubs,
  selectLiveGameById,
  selectProposedSub,
  selectProposedSwap,
  startGamePeriod,
} from './live-slice.js';

export const {
  // TODO: Remove this export of completeRoster when no longer needed in reducers/game.ts
  completeRoster,
  formationSelected,
  getLiveGame,
  startersCompleted,
  captainsCompleted,
  gameSetupCompleted,
  // Starter-related actions
  selectStarter,
  selectStarterPosition,
  applyStarter,
  cancelStarter,
  invalidStarters,
  // Clock-related actions
  configurePeriods,
  startPeriod,
  endPeriod,
  toggleClock,
  markPeriodOverdue,
  // Sub-related actions
  selectPlayer,
  cancelSub,
  confirmSub,
  cancelSwap,
  confirmSwap,
  // applyPendingSubs,
  // invalidPendingSubs,
  discardPendingSubs,
  markPlayerOut,
  returnOutPlayer,
  // Game status actions
  gameCompleted,
} = liveSlice.actions;
