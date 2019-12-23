import { RootAction } from '@app/store';
import { Game, GameDetail, Games, GameStatus, SetupTask } from '@app/models/game';
import { Player, PlayerStatus, Roster } from '@app/models/player';
import { Team, Teams } from '@app/models/team';

export function getFakeAction(): RootAction {
    // This must be a real action type, due to type checking. Using the offline
    // action as it will be unknown to all the lineup-specific actions/reducers.
    return { type: 'UPDATE_OFFLINE', offline: true };
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
        name: 'Some user'
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
    roster: rosterData
  };
}

export const TEST_USER_ID = 'U1234';

export function getPublicTeamData() {
  return { name: 'Public team 1' }
};

export function getPublicTeam(): Team {
  return { id: 'pt1', ...getPublicTeamData() }
};

export function getStoredTeamData() {
  return { name: 'Stored team 1' }
};

export function getStoredTeam(): Team {
  return { id: 'st1', ...getStoredTeamData() }
};

export function getNewPlayerData() {
  return { name: 'New player 1', uniformNumber: 1, positions: ['FB'], status: PlayerStatus.Off }
};

export function getNewPlayer(): Player {
  return { id: 'np1', ...getNewPlayerData() }
};

export function getStoredPlayerData() {
  return { name: 'Stored player 1', uniformNumber: 5, positions: ['CB'], status: PlayerStatus.Off }
};

export function getStoredPlayer(): Player {
  return { id: 'sp1', ...getStoredPlayerData() }
};

export function getNewGame(): Game {
  return {
    id: 'NG',
    status: GameStatus.New,
    name: 'New Game',
    teamId: 'T1',
    date: new Date(2016, 1, 10),
    opponent: 'Opponent for new'
  };
}

export function getNewGameDetail(roster?: Roster): GameDetail {
  return {
    ...getNewGame(),
    hasDetail: true,
    roster: roster || {}
  };
}

export function getNewGameWithLiveDetail(roster?: Roster, tasks?: SetupTask[]): GameDetail {
  const game: GameDetail = {
    ...getNewGameDetail(roster)
  };
  game.liveDetail = {
    id: game.id,
  };
  if (tasks) {
    game.liveDetail.setupTasks = tasks;
  }
  return game;
}

export const STORED_GAME_ID = 'sg1';
export const OTHER_STORED_GAME_ID = 'sg2';

export function getStoredGameData(status?: GameStatus): any {
  return {
    teamId: getStoredTeam().id,
    status: status ? status : GameStatus.New,
    name: 'Stored G',
    date: new Date(2016, 1, 10),
    opponent: 'Stored Game Opponent'
  };
};

export function getStoredGame(status?: GameStatus): Game {
  return {
    id: STORED_GAME_ID,
    ...getStoredGameData(status)
  };
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
