import {
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions,
  WithFieldValue
} from 'firebase/firestore';

export interface Model {
  id: string;
}

export interface ModelCollection<T extends Model> {
  [index: string]: T;
}

export interface ModelConverter<T extends Model> {
  fromDocument(id: string, data: DocumentData): T;
}

export class DataConverter<T extends Model> implements FirestoreDataConverter<T>  {
  private readonly converter: ModelConverter<T>;

  constructor(converter: ModelConverter<T>) {
    this.converter = converter;
  }

  toFirestore(_model: WithFieldValue<T>): DocumentData {
    // TODO: Implement when needed
    return {};
  }

  fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): T {
    const data = snapshot.data(options)!;
    return this.converter.fromDocument(snapshot.id, data);
  }
}
