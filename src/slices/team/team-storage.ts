import { DocumentData } from 'firebase/firestore';
import { Player, Roster } from '../../models/player';
import { reader } from '../../storage/firestore-reader.js';
import { ModelConverter } from '../../storage/model-converter.js';

const KEY_ROSTER = 'roster';
const KEY_TEAMS = 'teams';

const playerConverter: ModelConverter<Player> =
{
  fromDocument: (id: string, data: DocumentData) => {
    return {
      id,
      name: data.name,
      uniformNumber: data.uniformNumber,
      positions: data.positions || [],
      status: data.status
    };
  }
};

function buildTeamRosterPath(teamId: string) {
  return `${KEY_TEAMS}/${teamId}/${KEY_ROSTER}`;
}

export function loadTeamRoster(teamId: string): Promise<Roster> {
  return reader.loadCollection(buildTeamRosterPath(teamId), playerConverter);
}
