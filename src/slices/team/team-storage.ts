import { DocumentData } from 'firebase/firestore';
import { Player, PlayerStatus, Roster } from '../../models/player';
import { reader } from '../../storage/firestore-reader.js';
import { writer } from '../../storage/firestore-writer.js';
import { ModelConverter, ModelWriter } from '../../storage/model-converter.js';

const KEY_ROSTER = 'roster';
const KEY_TEAMS = 'teams';

const playerConverter: ModelConverter<Player> & ModelWriter<Player> =
{
  fromDocument: (id: string, data: DocumentData) => {
    return {
      id,
      name: data.name,
      uniformNumber: data.uniformNumber,
      positions: data.positions || [],
      status: data.status
    };
  },

  toDocument: (player) => {
    const data: DocumentData = {
      ...player,
    };
    if (!player.status) {
      data.status = PlayerStatus.Off;
    }
    if (!player.positions) {
      data.positions = [];
    }
    return data;
  }
};

function buildTeamRosterPath(teamId: string) {
  return `${KEY_TEAMS}/${teamId}/${KEY_ROSTER}`;
}

export function loadTeamRoster(teamId: string): Promise<Roster> {
  return reader.loadCollection(buildTeamRosterPath(teamId), playerConverter);
}

export function savePlayerToTeamRoster(newPlayer: Player, teamId: string) {
  writer.saveNewDocument(newPlayer, buildTeamRosterPath(teamId), playerConverter);
}
