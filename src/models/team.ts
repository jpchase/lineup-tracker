/**
@license
*/

export interface Team {
  id: string;
  name: string;
}

export interface Teams {
  [index: string]: Team;
}

export interface Player {
  id: string;
  name: string;
  uniformNumber: number;
  positions: string[];
  status: string;
}

export interface Roster {
  [index:string]: Player;
}
