/** @format */

import { DocumentData } from 'firebase/firestore';
import { RootState } from '../../app/store.js';
import { Player, Roster } from '../../models/player.js';
import { Team, Teams } from '../../models/team.js';
import { CollectionFilter, reader } from '../../storage/firestore-reader.js';
import { writer } from '../../storage/firestore-writer.js';
import { ModelReader } from '../../storage/model-converter.js';
import { playerConverter } from '../player/player-storage.js';

const KEY_ROSTER = 'roster';
const KEY_TEAMS = 'teams';

const teamConverter: ModelReader<Team> = {
  fromDocument: (id: string, data: DocumentData) => {
    return { id, name: data.name };
  },
};

function buildTeamRosterPath(teamId: string) {
  return `${KEY_TEAMS}/${teamId}/${KEY_ROSTER}`;
}

export function loadTeams(teamFilter: CollectionFilter): Promise<Teams> {
  return reader.loadCollection<Team, Teams>(KEY_TEAMS, teamConverter, teamFilter);
}

export function loadTeamRoster(teamId: string): Promise<Roster> {
  return reader.loadCollection(buildTeamRosterPath(teamId), playerConverter);
}

export async function persistTeam(newTeam: Team, state: RootState) {
  return writer.saveNewDocument(newTeam, KEY_TEAMS, undefined, state, { addUserId: true });
}

export async function savePlayerToTeamRoster(newPlayer: Player, teamId: string) {
  return writer.saveNewDocument(newPlayer, buildTeamRosterPath(teamId), playerConverter);
}
