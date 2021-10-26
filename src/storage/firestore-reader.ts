import {
  collection, Firestore, getDocs,
  query, where, QueryDocumentSnapshot, QuerySnapshot, WhereFilterOp
} from 'firebase/firestore';
import { debug } from '../common/debug.js';
import { firebaseRefs } from '../firebase.js';
import { DataConverter, Model, ModelCollection, ModelConverter } from './model-converter.js';

const debugFirestore = debug('firestore');

export interface CollectionFilter {
  field: string;
  operator: string;
  value: unknown;
}

export function whereFilter(field: string, operator: WhereFilterOp, value: unknown): CollectionFilter {
  return { field, operator, value };
}

function loadCollection<T extends Model, C extends ModelCollection<T>>(
  collectionPath: string, converter: ModelConverter<T>, filter?: CollectionFilter): Promise<C> {
  // TODO: Add try/catch for firestore/collection/get calls?
  const firestore: Firestore = firebaseRefs.firestore;
  const collectionRef = collection(firestore, collectionPath).withConverter(
    new DataConverter(converter));

  const queryRef = filter
    ? query<T>(collectionRef, where(filter.field, filter.operator as WhereFilterOp, filter.value))
    : collectionRef;

  debugFirestore(`loadCollection for [${collectionPath}]: filter = ${JSON.stringify(filter)}`);
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

// Trivial wrapper, mainly to allow for mocking in tests.
export const reader = {
  loadCollection
};
