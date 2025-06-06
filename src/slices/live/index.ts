/** @format */

import { liveSlice } from './live-slice.js';

export { getLiveSliceConfigurator } from './composed-reducer.js';
export {
  eventSelected,
  selectEventsSelected,
  selectGameEvents,
  eventUpdateRequested,
} from './events-slice.js';
export {
  endPeriodCreator,
  markPeriodOverdueCreator,
  pendingSubsAppliedCreator,
  startPeriodCreator,
  startersCompletedCreator,
  toggleClockCreator,
} from './live-action-creators.js';
export { eventsUpdated } from './live-action-types.js';
export {
  LiveState,
  rosterCompleted,
  selectInvalidStarters,
  selectInvalidSubs,
  selectLiveGameById,
  selectProposedSub,
  selectProposedSwap,
} from './live-slice.js';

// Only export actions that can be used directly, i.e. do not have a creator/wrapper.
//  - See export above for creator functions.
export const {
  formationSelected,
  getLiveGame,
  captainsCompleted,
  gameSetupCompleted,
  // Starter-related actions
  selectStarter,
  selectStarterPosition,
  applyStarter,
  cancelStarter,
  // Clock-related actions
  configurePeriods,
  // Sub-related actions
  selectPlayer,
  cancelSub,
  confirmSub,
  cancelSwap,
  confirmSwap,
  discardPendingSubs,
  markPlayerOut,
  returnOutPlayer,
  // Game status actions
  gameCompleted,
} = liveSlice.actions;
