/**
@license
*/

export interface Player {
  id: number;
  name: string;
  uniformNumber: number;
  positions: string[];
}

export interface Roster {
  [index:string]: Player;
}
