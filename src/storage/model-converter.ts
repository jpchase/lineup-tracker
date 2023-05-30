/** @format */

import { DocumentData, WithFieldValue } from 'firebase/firestore';
import { Model } from '../models/model.js';

export type ModelConverter<T extends Model> = ModelReader<T> & ModelWriter<T>;

export interface ModelReader<T extends Model> {
  fromDocument(id: string, data: DocumentData): T;
}

export interface ModelWriter<T extends Model> {
  toDocument(model: T | WithFieldValue<T>): DocumentData;
}
