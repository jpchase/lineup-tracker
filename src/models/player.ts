/** @format */

export enum PlayerStatus {
  Next = 'NEXT',
  Off = 'OFF',
  On = 'ON',
  Out = 'OUT',
}

export interface Player {
  id: string;
  name: string;
  uniformNumber: number;
  positions: string[];
  status: PlayerStatus;
}

export type Roster = Record<string, Player>;
