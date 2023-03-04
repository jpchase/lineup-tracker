import { Game } from '../../../src/models/game.js';
import { Player, PlayerStatus, Roster } from '../../../src/models/player.js';
// import { gameConverter } from '../../../src/slices/game/game-storage.js'
import { App, applicationDefault, initializeApp } from 'firebase-admin/app';
import { DocumentData, Firestore, FirestoreDataConverter, QueryDocumentSnapshot, QuerySnapshot, WithFieldValue } from 'firebase-admin/firestore';
import { getEnv } from '../../../src/app/environment.js';
import { Model, ModelCollection, ModelConverter, ModelReader } from '../../../src/storage/model-converter.js';

const KEY_GAMES = 'games';
const KEY_ROSTER = 'roster';

// import { buildGamePath, gameConverter } from '@app/slices/game/game-storage.js'
function buildGamePath(gameId: string) {
  return `${KEY_GAMES}/${gameId}`;
}

function buildGameRosterPath(gameId: string) {
  return `${buildGamePath(gameId)}/${KEY_ROSTER}`;
}

class ReaderConverter<T extends Model> implements FirestoreDataConverter<T>  {
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
  const app = initializeApp({
    projectId: env.firebase.options.projectId, // 'demo-integration',
    credential: applicationDefault()
  });
  return adminApp = app;
}

export async function readGame(firestore: Firestore, gameId: string): Promise<Game> {
  return getDocument(firestore, buildGamePath(gameId), gameConverter);
}

export async function readGameRoster(firestore: Firestore, gameId: string): Promise<Roster> {
  return loadCollection(firestore, buildGameRosterPath(gameId), playerConverter);
}

async function getDocument<T extends Model>(firestore: Firestore,
  documentPath: string, converter: ModelReader<T>): Promise<T> {

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

async function loadCollection<T extends Model, C extends ModelCollection<T>>(
  firestore: Firestore, collectionPath: string, converter: ModelReader<T>) {
  const collectionRef = firestore.collection(collectionPath).withConverter(
    new ReaderConverter(converter));

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
