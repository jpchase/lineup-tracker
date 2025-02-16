/** @format */

import {
  collection,
  doc,
  DocumentData,
  Firestore,
  FirestoreDataConverter,
  getDoc,
  getDocs,
  Query,
  query,
  QueryDocumentSnapshot,
  QuerySnapshot,
  SnapshotOptions,
  where,
  WhereFilterOp,
  WithFieldValue,
} from 'firebase/firestore';
import { firebaseRefs } from '../app/firebase.js';
import { Model, ModelCollection } from '../models/model.js';
import { logger } from '../util/logger.js';
import { ModelReader } from './model-converter.js';

const debugFirestore = logger('firestore');

export interface CollectionFilter {
  field: string;
  operator: string;
  value: unknown;
}

export function whereFilter(
  field: string,
  operator: WhereFilterOp,
  value: unknown,
): CollectionFilter {
  return { field, operator, value };
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

  fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): T {
    const data = snapshot.data(options)!;
    return this.converter.fromDocument(snapshot.id, data);
  }
}

function loadCollection<T extends Model, C extends ModelCollection<T>>(
  collectionPath: string,
  converter: ModelReader<T>,
  ...filters: CollectionFilter[]
): Promise<C> {
  // TODO: Add try/catch for firestore/collection/get calls?
  const firestore: Firestore = firebaseRefs.firestore;
  const collectionRef = collection(firestore, collectionPath).withConverter(
    new ReaderConverter(converter),
  );

  let queryRef: Query<T> = collectionRef;
  if (filters) {
    const constraints = filters.map((filter) => {
      return where(filter.field, filter.operator as WhereFilterOp, filter.value);
    });
    queryRef = query<T, DocumentData>(collectionRef, ...constraints);
  }

  debugFirestore(`loadCollection for [${collectionPath}]: filter = ${JSON.stringify(filters)}`);
  return getDocs(queryRef).then((querySnapshot: QuerySnapshot<T>) => {
    debugFirestore(`loadCollection for [${collectionPath}]: ${querySnapshot.size} result(s)`);

    const results = {} as ModelCollection<T>;

    querySnapshot.forEach((docSnapshot: QueryDocumentSnapshot<T>) => {
      const model = docSnapshot.data();
      results[model.id] = model;
    });

    debugFirestore(`loadCollection for [${collectionPath}]: ${JSON.stringify(results)}`);
    return results as C;
  });
}

async function loadDocument<T extends Model>(
  documentPath: string,
  converter: ModelReader<T>,
): Promise<T> {
  const firestore: Firestore = firebaseRefs.firestore;
  const documentRef = doc(firestore, documentPath);

  debugFirestore(`loadDocument for [${documentPath}]}`);
  const docSnapshot = await getDoc(documentRef);
  debugFirestore(`loadDocument for [${documentPath}]: exists = ${docSnapshot.exists()}`);
  if (!docSnapshot.exists()) {
    throw new Error(`Document not found: ${documentPath}`);
  }
  const result = converter.fromDocument(docSnapshot.id, docSnapshot.data());
  debugFirestore(`loadDocument for [${documentPath}]: ${JSON.stringify(result)}`);
  return result;
}

// Trivial wrapper, mainly to allow for mocking in tests.
export const reader = {
  loadCollection,
  loadDocument,
};
