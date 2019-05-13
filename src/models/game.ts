/**
@license
*/

export interface GameMetadata {
  name: string;
  date: Date;
  opponent: string;
}

export interface StoredGameData extends GameMetadata {
  teamId: string;
}

export interface Game extends StoredGameData {
  id: string;
}

export interface GameDetail extends Game {
}

export interface Games {
  [index: string]: Game;
}
