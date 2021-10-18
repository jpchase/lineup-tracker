import {
  collection, doc, DocumentData, DocumentReference, Firestore, FirestoreDataConverter,
  QueryDocumentSnapshot, setDoc, SnapshotOptions, WithFieldValue
} from 'firebase/firestore';
import { debug, debugError } from '../common/debug.js';
import { firebaseRefs } from '../firebase.js';
import { Model } from './model-converter.js';
import { useTestData } from '../init.js';
import { currentUserIdSelector } from '../reducers/auth.js';
import { currentTeamIdSelector } from '../reducers/team.js';
import { RootState } from '../store.js';

const debugFirestore = debug('firestore');

export interface NewDocOptions {
  addTeamId?: boolean;
  addUserId?: boolean;
  keepExistingId?: boolean;
}

function buildNewDocumentData(model: Model, state?: RootState, options?: NewDocOptions): DocumentData {
  const data: DocumentData = {
    ...model,
  };
  // Ensure there is no 'id' property, as that will prevent a unique id from being generated.
  if (!options || !options.keepExistingId) {
    delete data.id;
  }
  // Add parent ids, if necessary.
  if (options && state) {
    if (options.addTeamId) {
      data.teamId = currentTeamIdSelector(state);
    }
    if (options.addUserId) {
      data.owner_uid = currentUserIdSelector(state);
      debugFirestore(`buildNewDocumentData: owner_uid = ${data.owner_uid}`);
      if (!data.owner_uid) {
        throw new Error('No current user to set owner_uid');
      }
    }
  }
  return data;
}

class WriterConverter<T extends Model> implements FirestoreDataConverter<T>  {
  private readonly options: NewDocOptions | undefined;
  private readonly state: RootState | undefined;

  constructor(state?: RootState, options?: NewDocOptions) {
    this.state = state;
    // Default options, if necessary.
    this.options = options;
  }

  toFirestore(model: WithFieldValue<T>): DocumentData {
    return buildNewDocumentData(model as Model, this.state, this.options);
  }

  fromFirestore(_snapshot: QueryDocumentSnapshot, _options: SnapshotOptions): T {
    return {} as T;
  }
}

export function saveNewDocument<T extends Model>(
  model: T,
  collectionPathOrReference: string,
  state?: RootState, options?: NewDocOptions) {
  const firestore: Firestore = firebaseRefs.firestore;
  const collectionRef = collection(firestore, collectionPathOrReference).withConverter(
    new WriterConverter(state, options));

  // Unless requested to use model id, omit the doc path, which will cause a new unique id to be
  // generated.
  // NOTE: Firestore requires the parameter to be omitted entirely, it will throw for any value
  // that is not a non-empty string.
  const document: DocumentReference = (options && options.keepExistingId && model.id) ?
    doc(collectionRef, model.id) : doc(collectionRef);;

  debugFirestore(`saveNewDocument: data = ${JSON.stringify(model)}`);
  if (useTestData()) {
    debugFirestore('saveNewDocument: useTestData');
    (() => {
      debugFirestore('saveNewDocument: about to call set');
      setDoc(document, model).then(result => {
        debugFirestore('saveNewDocument: then -> ', result);
      }).catch((reason: any) => {
        debugError(`saveNewDocument: failed - ${reason}`);
      });
    })();
    debugFirestore('saveNewDocument: after iife');
  } else {
    debugFirestore('saveNewDocument: not useTestData');
    setDoc(document, model);
  }
  debugFirestore(`saveNewDocument: after, data = ${JSON.stringify(model)}`);
  model.id = document.id;
}
