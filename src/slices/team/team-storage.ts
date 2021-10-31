import { DocumentData } from 'firebase/firestore';
import { Player, PlayerStatus, Roster } from '../../models/player.js';
import { Team, Teams } from '../../models/team.js';
import { CollectionFilter, reader } from '../../storage/firestore-reader.js';
import { writer } from '../../storage/firestore-writer.js';
import { ModelConverter, ModelReader } from '../../storage/model-converter.js';
import { RootState } from '../../store.js';

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


const teamConverter: ModelReader<Team> =
{
  fromDocument: (id: string, data: DocumentData) => {
    return { id, name: data.name };
  }
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

export function persistTeam(newTeam: Team, state: RootState) {
  writer.saveNewDocument(newTeam, KEY_TEAMS, undefined, state, { addUserId: true });
}

export function savePlayerToTeamRoster(newPlayer: Player, teamId: string) {
  writer.saveNewDocument(newPlayer, buildTeamRosterPath(teamId), playerConverter);
}
