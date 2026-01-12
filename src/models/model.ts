/** @format */

export interface Model {
  id: string;
  teamId?: string;
}

export type ModelCollection<T extends Model> = Record<string, T>;
