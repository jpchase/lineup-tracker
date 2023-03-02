import { Game } from '@app/models/game.js';
// import { gameConverter } from '../../../src/slices/game/game-storage.js'
import { Model, ModelReader } from '@app/storage/model-converter.js';
import { App, applicationDefault, initializeApp } from 'firebase-admin/app';
import { DocumentData, Firestore } from 'firebase-admin/firestore';
import { getEnv } from '../../../src/app/environment.js';

const KEY_GAMES = 'games';
// const KEY_ROSTER = 'roster';

// import { buildGamePath, gameConverter } from '@app/slices/game/game-storage.js'
function buildGamePath(gameId: string) {
  return `${KEY_GAMES}/${gameId}`;
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
  // const firestore = getFirestore(app);
  return getDocument(firestore, buildGamePath(gameId), gameConverter);
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

export async function loadCollection(_path: string) {

}
