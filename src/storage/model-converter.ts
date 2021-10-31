import {
  DocumentData,
  WithFieldValue
} from 'firebase/firestore';

export interface Model {
  id: string;
}

export interface ModelCollection<T extends Model> {
  [index: string]: T;
}

export type ModelConverter<T extends Model> = ModelReader<T> & ModelWriter<T>;

export interface ModelReader<T extends Model> {
  fromDocument(id: string, data: DocumentData): T;
}

export interface ModelWriter<T extends Model> {
  toDocument(model: T | WithFieldValue<T>): DocumentData;
}
