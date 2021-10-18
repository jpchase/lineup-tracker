import {
  collection, Firestore, getDocs,
  query, QueryConstraint, QueryDocumentSnapshot, QuerySnapshot
} from 'firebase/firestore';
import { debug } from '../common/debug.js';
import { firebaseRefs } from '../firebase.js';
import { DataConverter, Model, ModelCollection, ModelConverter } from './model-converter.js';

const debugFirestore = debug('firestore');

export function loadCollection<T extends Model, C extends ModelCollection<T>>(
  collectionPath: string, converter: ModelConverter<T>, queryConstraint?: QueryConstraint): Promise<C> {
  // TODO: Add try/catch for firestore/collection/get calls?
  const firestore: Firestore = firebaseRefs.firestore;
  const collectionRef = collection(firestore, collectionPath).withConverter(
    new DataConverter(converter));

  const queryRef = queryConstraint ? query<T>(collectionRef, queryConstraint) : collectionRef;

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
