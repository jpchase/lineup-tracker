/** @format */

export interface Model {
  id: string;
  teamId?: string;
}

export interface ModelCollection<T extends Model> {
  [index: string]: T;
}
