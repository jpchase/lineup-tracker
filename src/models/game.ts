/**
@license
*/

export interface GameMetadata {
  name: string;
  date: Date;
  opponent: string;
}

export interface Game {
  id: string;
  teamId: string;
  date: Date;
  opponent: string;
}

export interface Games {
  [index: string]: Game;
}
