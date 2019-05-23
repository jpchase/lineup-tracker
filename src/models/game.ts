/**
@license
*/
import { Roster } from './player';

export interface GameMetadata {
  name: string;
  date: Date;
  opponent: string;
}

export interface Game extends GameMetadata {
  id: string;
  teamId: string;
  hasDetail?: boolean;
}

export interface GameDetail extends Game {
  roster: Roster;
}

export interface Games {
  [index: string]: Game;
}
