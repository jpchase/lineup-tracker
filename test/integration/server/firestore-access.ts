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
import { Player, PlayerStatus, Roster } from '../../../src/models/player.js';
// import { gameConverter } from '../../../src/slices/game/game-storage.js'
import { NewDocOptions } from '../../../src/storage/firestore-writer.js';
import {
  Model,
  ModelCollection,
  ModelConverter,
  ModelReader,
  ModelWriter,
} from '../../../src/storage/model-converter.js';

const KEY_GAMES = 'games';
const KEY_ROSTER = 'roster';

// import { buildGamePath, gameConverter } from '@app/slices/game/game-storage.js'
function buildGamePath(gameId: string) {
  return `${KEY_GAMES}/${gameId}`;
}

function buildGameRosterPath(gameId: string) {
  return `${buildGamePath(gameId)}/${KEY_ROSTER}`;
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
      id: id,
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

export async function readGame(firestore: Firestore, gameId: string): Promise<Game> {
  return getDocument(firestore, buildGamePath(gameId), gameConverter);
}

export async function readGameRoster(firestore: Firestore, gameId: string): Promise<Roster> {
  return loadCollection(firestore, buildGameRosterPath(gameId), playerConverter);
}

export async function copyGame(
  firestore: Firestore,
  gameId: string,
  userId: string
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
        return;
      });
    })
  );

  copiedGame.hasDetail = true;
  copiedGame.roster = roster;
  return copiedGame;
}

async function getDocument<T extends Model>(
  firestore: Firestore,
  documentPath: string,
  converter: ModelReader<T>
): Promise<T> {
  const docRef = firestore.doc(documentPath);

  console.log(`getDocument for [${documentPath}]}`);
  const docSnapshot = await docRef.get();
  console.log(`getDocument for [${documentPath}]: exists = ${docSnapshot.exists}`);
  if (!docSnapshot.exists) {
    throw new Error(`Document not found: ${documentPath}`);
  }
  const result = converter.fromDocument(docSnapshot.id, docSnapshot.data()!);
  console.log(`getDocument for [${documentPath}]: ${JSON.stringify(result)}`);
  return result;
}

async function writeDocument<T extends Model>(
  firestore: Firestore,
  model: T,
  collectionPathOrReference: string,
  modelWriter?: ModelWriter<T>,
  options?: NewDocOptions
) {
  const collectionRef = firestore
    .collection(collectionPathOrReference)
    .withConverter(new WriterConverter(modelWriter, options));

  // Unless requested to use model id, omit the doc path, which will cause a new unique id to be
  // generated.
  const document: DocumentReference =
    options?.keepExistingId && model.id ? collectionRef.doc(model.id) : collectionRef.doc();

  // console.log(`writeDocument: data = ${JSON.stringify(model)}`);
  try {
    await document.set(model);
  } catch (reason: any) {
    console.log(`writeDocument: failed - ${reason}`);
  }

  // console.log(`writeDocument: after, document[${document.id}] = ${JSON.stringify(document)}`);
  model.id = document.id;
}

async function loadCollection<T extends Model, C extends ModelCollection<T>>(
  firestore: Firestore,
  collectionPath: string,
  converter: ModelReader<T>
) {
  const collectionRef = firestore
    .collection(collectionPath)
    .withConverter(new ReaderConverter(converter));

  console.log(`loadCollection for [${collectionPath}]: about to query`);
  return collectionRef.get().then((querySnapshot: QuerySnapshot<T>) => {
    const results = {} as ModelCollection<T>;
    console.log(`loadCollection for [${collectionPath}]: ${querySnapshot.size} result(s)`);

    querySnapshot.forEach((docSnapshot: QueryDocumentSnapshot<T>) => {
      const model = docSnapshot.data();
      results[model.id] = model;
    });
    console.log(`loadCollection for [${collectionPath}]: ${JSON.stringify(results)}`);

    return results as C;
  });
}
