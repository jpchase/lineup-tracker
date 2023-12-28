/** @format */
import { SliceConfigurator, buildSliceConfigurator } from '../../middleware/slice-configurator.js';
import { teamSlice } from './team-slice.js';

export { addTeam } from './team-slice.js';

export function getTeamSliceConfigurator(): SliceConfigurator {
  return buildSliceConfigurator(teamSlice);
}
