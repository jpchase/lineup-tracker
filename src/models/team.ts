/** @format */

export interface TeamData {
  name: string;
}

export interface Team extends TeamData {
  id: string;
}

export type Teams = Record<string, Team>;
