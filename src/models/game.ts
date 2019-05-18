/**
@license
*/

export interface GameMetadata {
  name: string;
  date: Date;
  opponent: string;
}

export interface Game extends GameMetadata {
  id: string;
  teamId: string;
}

export interface GameDetail extends Game {
}

export interface Games {
  [index: string]: Game;
}
