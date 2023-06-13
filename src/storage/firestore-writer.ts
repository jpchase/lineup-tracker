/** @format */

import {
  collection,
  doc,
  DocumentData,
  DocumentReference,
  Firestore,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  setDoc,
  SnapshotOptions,
  updateDoc,
  WithFieldValue,
} from 'firebase/firestore';
import { debug, debugError } from '../common/debug.js';
import { firebaseRefs } from '../firebase.js';
import { selectCurrentTeam } from '../slices/app/app-slice.js';
import { selectCurrentUserId } from '../slices/auth/auth-slice.js';
import { RootState } from '../store.js';
import { Model, ModelWriter } from './model-converter.js';

const debugFirestore = debug('firestore');

export interface NewDocOptions {
  addTeamId?: boolean;
  addUserId?: boolean;
  currentUserId?: string;
  keepExistingId?: boolean;
}

function buildNewDocumentData(
  model: Model,
  modelWriter?: ModelWriter<any>,
  options?: NewDocOptions
): DocumentData {
  const data: DocumentData = modelWriter
    ? modelWriter.toDocument(model)
    : {
        ...model,
      };
  // Ensure there is no 'id' property, as that will prevent a unique id from being generated.
  if (!options?.keepExistingId) {
    delete data.id;
  }
  // Add parent ids, if necessary.
  if (options?.addTeamId && !data.teamId) {
    data.teamId = model.teamId;
  }
  if (options?.addUserId) {
    data.owner_uid = options.currentUserId;
  }
  return data;
}

class WriterConverter<T extends Model> implements FirestoreDataConverter<T> {
  private readonly options: NewDocOptions | undefined;
  private readonly modelWriter: ModelWriter<T> | undefined;

  constructor(modelWriter?: ModelWriter<T>, options?: NewDocOptions) {
    this.modelWriter = modelWriter;
    this.options = options;
  }

  toFirestore(model: WithFieldValue<T>): DocumentData {
    return buildNewDocumentData(model as Model, this.modelWriter, this.options);
  }

  // Unused.
  fromFirestore(_snapshot: QueryDocumentSnapshot, _options: SnapshotOptions): T {
    return {} as T;
  }
}

async function saveNewDocument<T extends Model>(
  model: T,
  collectionPathOrReference: string,
  modelWriter?: ModelWriter<T>,
  state?: RootState,
  options?: NewDocOptions
) {
  // Set parent ids, if necessary.
  if (options && state) {
    if (options.addTeamId) {
      model.teamId = selectCurrentTeam(state)?.id;
      debugFirestore(`saveNewDocument: teamId = ${model.teamId}`);
      if (!model.teamId) {
        throw new Error('No current team id');
      }
    }
    if (options.addUserId && !options.currentUserId) {
      // eslint-disable-next-line no-param-reassign
      options.currentUserId = selectCurrentUserId(state);
      debugFirestore(`saveNewDocument: currentUserId = ${options.currentUserId}`);
      if (!options.currentUserId) {
        throw new Error('No current user to set owner_uid');
      }
    }
  }

  const firestore: Firestore = firebaseRefs.firestore;
  const collectionRef = collection(firestore, collectionPathOrReference).withConverter(
    new WriterConverter(modelWriter, options)
  );

  // Unless requested to use model id, omit the doc path, which will cause a new unique id to be
  // generated.
  // NOTE: Firestore requires the parameter to be omitted entirely, it will throw for any value
  // that is not a non-empty string.
  const document: DocumentReference =
    options?.keepExistingId && model.id ? doc(collectionRef, model.id) : doc(collectionRef);

  debugFirestore(`saveNewDocument: data = ${JSON.stringify(model)}`);
  try {
    await setDoc(document, model);
  } catch (reason: any) {
    debugError(`saveNewDocument: failed - ${reason}`);
  }

  debugFirestore(`saveNewDocument: after, document[${document.id}] = ${JSON.stringify(document)}`);
  model.id = document.id;
}

function updateDocument<T extends Model>(modelUpdate: Partial<T>, documentPath: string) {
  const firestore: Firestore = firebaseRefs.firestore;
  const documentRef: DocumentReference = doc(firestore, documentPath);

  const data: DocumentData = { ...modelUpdate };
  updateDoc(documentRef, data);
}

// Trivial wrapper, mainly to allow for mocking in tests.
export const writer = {
  saveNewDocument,
  updateDocument,
};
