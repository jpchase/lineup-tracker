/**
@license
*/

export interface Player {
  id: string;
  name: string;
  uniformNumber: number;
  positions: string[];
}

export interface Roster {
  [index:string]: Player;
}
