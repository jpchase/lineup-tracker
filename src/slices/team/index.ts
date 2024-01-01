/** @format */

// import { teamSlice } from './team-slice.js';

export {
  addNewPlayer,
  addNewTeam,
  addTeam,
  getRoster,
  getTeamSliceConfigurator,
  getTeams,
  selectTeamsLoaded,
} from './team-slice.js';

// Only export actions that can be used directly, i.e. do not have a creator/wrapper.
//  - See export above for creator functions.
// export const { addTeam } = teamSlice.actions;
