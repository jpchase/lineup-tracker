import { RootAction } from '@app/store';
import { Game, Games } from '@app/models/game';
import { Player, Roster } from '@app/models/player';
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
