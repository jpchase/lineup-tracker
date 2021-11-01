import { DocumentData } from 'firebase/firestore';
import { debug } from '../../common/debug';
import { Game, Games } from '../../models/game.js';
import { CollectionFilter, reader, whereFilter } from '../../storage/firestore-reader.js';
import { writer } from '../../storage/firestore-writer.js';
import { ModelReader } from '../../storage/model-converter.js';
import { RootState } from '../../store.js';

const FIELD_OWNER = 'owner_uid';
const FIELD_PUBLIC = 'public';
const FIELD_TEAMID = 'teamId';
const KEY_GAMES = 'games';

const debugStorage = debug('game-storage');

const gameConverter: ModelReader<Game> =
{
  fromDocument: (id: string, data: DocumentData): Game => {
    return {
      id: id,
      teamId: data.teamId,
      status: data.status,
      name: data.name,
      date: data.date.toDate(),
      opponent: data.opponent
    };
  }
};

export function loadGames(teamId: string, currentUserId?: string): Promise<Games> {
  let gameFilter: CollectionFilter;
  if (currentUserId) {
    debugStorage(`Get games for owner = ${currentUserId}`);
    gameFilter = whereFilter(FIELD_OWNER, '==', currentUserId);
  } else {
    debugStorage(`Get public games`);
    gameFilter = whereFilter(FIELD_PUBLIC, '==', true);
  }
  return reader.loadCollection<Game, Games>(KEY_GAMES, gameConverter, gameFilter,
    whereFilter(FIELD_TEAMID, '==', teamId));
}

export function persistNewGame(newGame: Game, state: RootState) {
  writer.saveNewDocument(newGame, KEY_GAMES, undefined, state, { addTeamId: true, addUserId: true });
}
