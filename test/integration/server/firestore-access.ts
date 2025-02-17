/** @format */

import { App, applicationDefault, initializeApp } from 'firebase-admin/app';
import {
  DocumentData,
  DocumentReference,
  Firestore,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  QuerySnapshot,
  WithFieldValue,
} from 'firebase-admin/firestore';
import { getEnv } from '../../../src/app/environment.js';
import { Game, GameDetail } from '../../../src/models/game.js';
import { Model, ModelCollection } from '../../../src/models/model.js';
import { Player, PlayerStatus, Roster } from '../../../src/models/player.js';
import { Team } from '../../../src/models/team.js';
// import { gameConverter } from '../../../src/slices/game/game-storage.js'
import { NewDocOptions } from '../../../src/storage/firestore-writer.js';
import { ModelConverter, ModelReader, ModelWriter } from '../../../src/storage/model-converter.js';
import { logWithTime } from '../pages/page-object.js';

export { Firestore, getFirestore } from 'firebase-admin/firestore';

const KEY_GAMES = 'games';
const KEY_ROSTER = 'roster';
const KEY_TEAMS = 'teams';

// import { buildGamePath, gameConverter } from '@app/slices/game/game-storage.js'
function buildGamePath(gameId: string) {
  return `${KEY_GAMES}/${gameId}`;
}

function buildGameRosterPath(gameId: string) {
  return `${buildGamePath(gameId)}/${KEY_ROSTER}`;
}

function buildTeamPath(teamId: string) {
  return `${KEY_TEAMS}/${teamId}`;
}

function buildTeamRosterPath(teamId: string) {
  return `${buildTeamPath(teamId)}/${KEY_ROSTER}`;
}

class ReaderConverter<T extends Model> implements FirestoreDataConverter<T> {
  private readonly converter: ModelReader<T>;

  constructor(converter: ModelReader<T>) {
    this.converter = converter;
  }

  // Unused.
  toFirestore(_model: WithFieldValue<T>): DocumentData {
    return {};
  }

  fromFirestore(snapshot: QueryDocumentSnapshot): T {
    const data = snapshot.data()!;
    return this.converter.fromDocument(snapshot.id, data);
  }
}

class WriterConverter<T extends Model> implements FirestoreDataConverter<T> {
  private readonly options: NewDocOptions | undefined;
  private readonly modelWriter: ModelWriter<T> | undefined;

  constructor(modelWriter?: ModelWriter<T>, options?: NewDocOptions) {
    this.modelWriter = modelWriter;
    this.options = options;
  }

  toFirestore(model: WithFieldValue<T>): DocumentData {
    const data: DocumentData = this.modelWriter
      ? this.modelWriter.toDocument(model)
      : {
          ...model,
        };
    // Ensure there is no 'id' property, as that will prevent a unique id from being generated.
    if (!this.options?.keepExistingId) {
      delete data.id;
    }
    // Add parent ids, if necessary.
    if (this.options?.addTeamId && !data.teamId) {
      data.teamId = model.teamId;
    }
    if (this.options?.addUserId) {
      data.owner_uid = this.options.currentUserId;
    }
    return data;
  }

  // Unused.
  fromFirestore(_snapshot: QueryDocumentSnapshot): T {
    return {} as T;
  }
}

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

const playerConverter: ModelConverter<Player> = {
  fromDocument: (id: string, data: DocumentData) => {
    return {
      id,
      name: data.name,
      uniformNumber: data.uniformNumber,
      positions: data.positions || [],
      status: data.status,
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
  },
};

const teamConverter: ModelReader<Team> = {
  fromDocument: (id: string, data: DocumentData) => {
    return { id, name: data.name };
  },
};

export function getFirestoreUrl(projectId: string, databaseName?: string) {
  const database = databaseName || '(default)';
  return `/projects/${projectId}/databases/${database}/documents/cities/LA`;
}

let adminApp: App;

export function createAdminApp(): App {
  if (adminApp) {
    return adminApp;
  }

  const env = getEnv();
  const emulators = env.firebase.emulators!;

  process.env.FIRESTORE_EMULATOR_HOST = `${emulators.firestore.hostname}:${emulators.firestore.port}`;
  process.env.FIREBASE_AUTH_EMULATOR_HOST = `${emulators.auth.hostname}:${emulators.auth.port}/`;
  adminApp = initializeApp({
    projectId: env.firebase.options.projectId, // 'demo-integration',
    credential: applicationDefault(),
  });
  return adminApp;
}

export async function readTeam(firestore: Firestore, teamId: string): Promise<Team> {
  return getDocument(firestore, buildTeamPath(teamId), teamConverter);
}

export async function readTeamRoster(firestore: Firestore, teamId: string): Promise<Roster> {
  return loadCollection(firestore, buildTeamRosterPath(teamId), playerConverter);
}

export async function readGame(firestore: Firestore, gameId: string): Promise<Game> {
  return getDocument(firestore, buildGamePath(gameId), gameConverter);
}

export async function readGameRoster(firestore: Firestore, gameId: string): Promise<Roster> {
  return loadCollection(firestore, buildGameRosterPath(gameId), playerConverter);
}

export async function copyGame(
  firestore: Firestore,
  gameId: string,
  userId: string,
): Promise<GameDetail> {
  const existingGame = await readGame(firestore, gameId);
  const existingRoster = await readGameRoster(firestore, gameId);

  const copiedGame = {
    ...existingGame,
    name: 'Copied Game',
  } as GameDetail;
  await writeDocument(firestore, copiedGame, KEY_GAMES, undefined, {
    addUserId: true,
    currentUserId: userId,
  });

  if (copiedGame.id === existingGame.id) {
    throw new Error('Copied game not saved successfully');
  }

  const roster: Roster = {};
  const rosterPath = buildGameRosterPath(copiedGame.id);
  const options: NewDocOptions = { keepExistingId: true };
  await Promise.all(
    Object.keys(existingRoster).map((key) => {
      // Copies the player to a new player object.
      const gamePlayer: Player = {
        ...existingRoster[key],
      };
      // Saves player to game roster storage, but keep the same id.
      return writeDocument(firestore, gamePlayer, rosterPath, playerConverter, options).then(() => {
        roster[gamePlayer.id] = gamePlayer;
      });
    }),
  );

  copiedGame.hasDetail = true;
  copiedGame.roster = roster;
  return copiedGame;
}

export async function copyTeam(
  firestore: Firestore,
  teamId: string,
  userId: string,
): Promise<{ team: Team; roster: Roster }> {
  const existingTeam = await readTeam(firestore, teamId);
  const existingRoster = await readTeamRoster(firestore, teamId);

  const copiedTeam = {
    ...existingTeam,
    name: `Copied Team [${Math.floor(Math.random() * 1000)}]`,
  } as Team;
  await writeDocument(firestore, copiedTeam, KEY_TEAMS, undefined, {
    addUserId: true,
    currentUserId: userId,
  });

  if (copiedTeam.id === existingTeam.id) {
    throw new Error('Copied team not saved successfully');
  }

  const roster: Roster = {};
  const rosterPath = buildTeamRosterPath(copiedTeam.id);
  const options: NewDocOptions = { keepExistingId: false };
  await Promise.all(
    Object.keys(existingRoster).map((key) => {
      // Copies the player to a new player object.
      const teamPlayer: Player = {
        ...existingRoster[key],
      };
      // Saves player to team roster storage, with an new id.
      return writeDocument(firestore, teamPlayer, rosterPath, playerConverter, options).then(() => {
        roster[teamPlayer.id] = teamPlayer;
      });
    }),
  );

  return { team: copiedTeam, roster };
}

async function getDocument<T extends Model>(
  firestore: Firestore,
  documentPath: string,
  converter: ModelReader<T>,
): Promise<T> {
  const docRef = firestore.doc(documentPath);

  logWithTime(`getDocument for [${documentPath}]}`);
  const docSnapshot = await docRef.get();
  logWithTime(`getDocument for [${documentPath}]: exists = ${docSnapshot.exists}`);
  if (!docSnapshot.exists) {
    throw new Error(`Document not found: ${documentPath}`);
  }
  const result = converter.fromDocument(docSnapshot.id, docSnapshot.data()!);
  logWithTime(`getDocument for [${documentPath}]: ${JSON.stringify(result)}`);
  return result;
}

async function writeDocument<T extends Model>(
  firestore: Firestore,
  model: T,
  collectionPathOrReference: string,
  modelWriter?: ModelWriter<T>,
  options?: NewDocOptions,
) {
  const collectionRef = firestore
    .collection(collectionPathOrReference)
    .withConverter(new WriterConverter(modelWriter, options));

  // Unless requested to use model id, omit the doc path, which will cause a new unique id to be
  // generated.
  const document: DocumentReference =
    options?.keepExistingId && model.id ? collectionRef.doc(model.id) : collectionRef.doc();

  // logWithTime(`writeDocument: data = ${JSON.stringify(model)}`);
  try {
    await document.set(model);
  } catch (reason: any) {
    logWithTime(`writeDocument: failed - ${reason}`);
  }

  // logWithTime(`writeDocument: after, document[${document.id}] = ${JSON.stringify(document)}`);
  model.id = document.id;
}

async function loadCollection<T extends Model, C extends ModelCollection<T>>(
  firestore: Firestore,
  collectionPath: string,
  converter: ModelReader<T>,
) {
  const collectionRef = firestore
    .collection(collectionPath)
    .withConverter(new ReaderConverter(converter));

  logWithTime(`loadCollection for [${collectionPath}]: about to query`);
  return collectionRef.get().then((querySnapshot: QuerySnapshot<T>) => {
    const results = {} as ModelCollection<T>;
    logWithTime(`loadCollection for [${collectionPath}]: ${querySnapshot.size} result(s)`);

    querySnapshot.forEach((docSnapshot: QueryDocumentSnapshot<T>) => {
      const model = docSnapshot.data();
      results[model.id] = model;
    });
    logWithTime(`loadCollection for [${collectionPath}]: ${JSON.stringify(results)}`);

    return results as C;
  });
}
