/** @format */

import { Game, GameDetail, Games, GameStatus } from '@app/models/game.js';
import { LivePlayer } from '@app/models/live.js';
import { Player, PlayerStatus, Roster } from '@app/models/player.js';
import { Team, Teams } from '@app/models/team.js';

export function getFakeAction() {
  return { type: 'FAKE_ACTION' };
}

export interface MockAuthStateOptions {
  signedIn?: boolean;
  userId?: string;
}

export function getMockAuthState(options?: MockAuthStateOptions) {
  let mockAuth: any = { user: undefined };
  if (options && options.signedIn) {
    mockAuth.user = {
      id: options.userId,
      name: 'Some user',
    };
  }
  return mockAuth;
}

export function getMockTeamState(teams: Team[], currentTeam?: Team, players?: Player[]) {
  const teamData = buildTeams(teams);
  const rosterData = buildRoster(players);

  return {
    teamId: currentTeam ? currentTeam.id : '',
    teamName: currentTeam ? currentTeam.name : '',
    teams: teamData,
    roster: rosterData,
  };
}

export const TEST_USER_ID = 'U1234';

export function getPublicTeamData() {
  return { name: 'Public team 1' };
}

export function getPublicTeam(): Team {
  return { id: 'pt1', ...getPublicTeamData() };
}

export function getStoredTeamData() {
  return { name: 'Stored team 1' };
}

export function getStoredTeam(): Team {
  return { id: 'st1', ...getStoredTeamData() };
}

export function getNewPlayerData() {
  return { name: 'New player 1', uniformNumber: 1, positions: ['FB'], status: PlayerStatus.Off };
}

export function getNewPlayer(): Player {
  return { id: 'np1', ...getNewPlayerData() };
}

export function getStoredPlayerData() {
  return { name: 'Stored player 1', uniformNumber: 5, positions: ['CB'], status: PlayerStatus.Off };
}

export function getStoredPlayer(): Player {
  return { id: 'sp1', ...getStoredPlayerData() };
}

export function getOtherStoredPlayerData() {
  return {
    name: '2nd Stored player',
    uniformNumber: 5,
    positions: ['CB'],
    status: PlayerStatus.Off,
  };
}

export function getOtherStoredPlayer(): Player {
  return { id: 'sp2', ...getOtherStoredPlayerData() };
}

export function getNewGame(): Game {
  return {
    id: 'NG',
    status: GameStatus.New,
    name: 'New Game',
    teamId: 'T1',
    date: new Date(2016, 1, 10),
    opponent: 'Opponent for new',
  };
}

export function getNewGameDetail(roster?: Roster): GameDetail {
  return {
    ...getNewGame(),
    hasDetail: true,
    roster: roster || {},
  };
}

export const STORED_GAME_ID = 'sg1';
export const OTHER_STORED_GAME_ID = 'sg2';
export const PUBLIC_GAME_ID = 'pg1';

export function getStoredGameData(status?: GameStatus): any {
  return {
    teamId: getStoredTeam().id,
    status: status ?? GameStatus.New,
    name: 'Stored G',
    date: new Date(2016, 1, 10),
    opponent: 'Stored Game Opponent',
  };
}

export function getStoredGame(status?: GameStatus): Game {
  return {
    id: STORED_GAME_ID,
    ...getStoredGameData(status),
  };
}

export function getPublicGameData(): any {
  return {
    teamId: getPublicTeam().id,
    status: GameStatus.Done,
    name: 'Public G',
    date: new Date(2016, 1, 10),
    opponent: 'Public Opponent',
  };
}

export function getPublicGame(): Game {
  return { id: PUBLIC_GAME_ID, ...getPublicGameData() };
}

export function buildGames(games: Game[]): Games {
  return games.reduce((obj, game) => {
    obj[game.id] = game;
    return obj;
  }, {} as Games);
}

export function buildTeams(teams: Team[]): Teams {
  return teams.reduce((obj, team) => {
    obj[team.id] = team;
    return obj;
  }, {} as Teams);
}

export function buildRoster(players?: Player[]): Roster {
  if (!players) {
    return {} as Roster;
  }
  return players.reduce((obj, player) => {
    obj[player.id] = player;
    return obj;
  }, {} as Roster);
}

export function buildLivePlayers(players?: Player[]): LivePlayer[] {
  if (!players) {
    return [];
  }
  return players.reduce((obj, player) => {
    obj.push(player);
    return obj;
  }, [] as LivePlayer[]);
}
