/** @format */

export interface TeamData {
  name: string;
}

export interface Team extends TeamData {
  id: string;
}

export interface Teams {
  [index: string]: Team;
}
