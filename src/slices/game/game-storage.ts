/** @format */

import { DocumentData } from 'firebase/firestore';
import { Game, Games } from '../../models/game.js';
import { Player, Roster } from '../../models/player.js';
import { CollectionFilter, reader, whereFilter } from '../../storage/firestore-reader.js';
import { NewDocOptions, writer } from '../../storage/firestore-writer.js';
import { ModelReader } from '../../storage/model-converter.js';
import { RootState } from '../../store.js';
import { logger } from '../../util/logger.js';
import { playerConverter } from '../player/player-storage.js';

const FIELD_OWNER = 'owner_uid';
const FIELD_PUBLIC = 'public';
const FIELD_TEAMID = 'teamId';
const KEY_GAMES = 'games';
const KEY_ROSTER = 'roster';

const debugStorage = logger('game-storage');

const gameConverter: ModelReader<Game> = {
  fromDocument: (id: string, data: DocumentData): Game => {
    return {
      id,
      teamId: data.teamId,
      status: data.status,
      name: data.name,
      date: data.date.toDate(),
      opponent: data.opponent,
    };
  },
};

function buildGamePath(gameId: string) {
  return `${KEY_GAMES}/${gameId}`;
}

function buildGameRosterPath(gameId: string) {
  return `${buildGamePath(gameId)}/${KEY_ROSTER}`;
}

export function loadGames(teamId: string, currentUserId?: string): Promise<Games> {
  let gameFilter: CollectionFilter;
  if (currentUserId) {
    debugStorage(`Get games for owner = ${currentUserId}`);
    gameFilter = whereFilter(FIELD_OWNER, '==', currentUserId);
  } else {
    debugStorage(`Get public games`);
    gameFilter = whereFilter(FIELD_PUBLIC, '==', true);
  }
  return reader.loadCollection<Game, Games>(
    KEY_GAMES,
    gameConverter,
    gameFilter,
    whereFilter(FIELD_TEAMID, '==', teamId),
  );
}

export async function persistNewGame(newGame: Game, state: RootState) {
  return writer.saveNewDocument(newGame, KEY_GAMES, undefined, state, {
    addTeamId: true,
    addUserId: true,
  });
}

export function updateExistingGame(gameId: string, game: Partial<Game>) {
  writer.updateDocument<Game>(game, buildGamePath(gameId));
}

export function loadGame(gameId: string): Promise<Game> {
  return reader.loadDocument(buildGamePath(gameId), gameConverter);
}

export function loadGameRoster(gameId: string): Promise<Roster> {
  return reader.loadCollection(buildGameRosterPath(gameId), playerConverter);
}

export async function persistGamePlayer(newPlayer: Player, gameId: string, isNew: boolean) {
  const options: NewDocOptions = isNew ? {} : { keepExistingId: true };
  return writer.saveNewDocument(
    newPlayer,
    buildGameRosterPath(gameId),
    playerConverter,
    undefined,
    options,
  );
}
