import { Player } from '@app/models/player';
import { Team, Teams } from '@app/models/team';
import { ADD_PLAYER, ADD_TEAM, CHANGE_TEAM, GET_ROSTER, GET_TEAMS } from '@app/actions/team-types';
import team from '@app/reducers/team';
import { TeamState } from '@app/reducers/team';
import {
  buildRoster, buildTeams,
  getFakeAction,
  getNewPlayer,
  getStoredPlayer, getStoredTeam, getPublicTeam
} from '../helpers/test_data';

const TEAM_INITIAL_STATE: TeamState = {
  teams: {} as Teams,
  teamId: '',
  teamName: '',
  roster: {},
  error: ''
};

describe('Teams reducer', () => {
  const newTeam: Team = {
    id: 'nt1', name: 'New team 1'
  };

  it('should return the initial state', () => {
    expect(
      team(TEAM_INITIAL_STATE, getFakeAction())
    ).toEqual(TEAM_INITIAL_STATE);
  });

  describe('GET_TEAMS', () => {
    it('should set the teams state to the retrieved list', () => {
      const expectedTeams = buildTeams([getStoredTeam()]);

      const newState = team(TEAM_INITIAL_STATE, {
        type: GET_TEAMS,
        teams: expectedTeams
      });

      expect(newState).toEqual(expect.objectContaining({
        teams: expectedTeams,
      }));

      expect(newState).not.toBe(TEAM_INITIAL_STATE);
      expect(newState.teams).not.toBe(TEAM_INITIAL_STATE.teams);
    });

    it('should set the current team when cachedTeamId provided', () => {
      const storedTeam = getStoredTeam();
      const expectedTeams = buildTeams([storedTeam, getPublicTeam()]);

      const newState = team(TEAM_INITIAL_STATE, {
        type: GET_TEAMS,
        teams: expectedTeams,
        cachedTeamId: storedTeam.id
      });

      expect(newState).toEqual(expect.objectContaining({
        teams: expectedTeams,
        teamId: storedTeam.id,
        teamName: storedTeam.name
      }));

      expect(newState).not.toBe(TEAM_INITIAL_STATE);
      expect(newState.teams).not.toBe(TEAM_INITIAL_STATE.teams);
    });

    it('should ignore the cachedTeamId when current team already set', () => {
      const storedTeam = getStoredTeam();
      const currentState: TeamState = {
        ...TEAM_INITIAL_STATE,
        teamId: storedTeam.id,
        teamName: storedTeam.name
      }
      const expectedTeams = buildTeams([storedTeam, getPublicTeam()]);

      const newState = team(currentState, {
        type: GET_TEAMS,
        teams: expectedTeams,
        cachedTeamId: getPublicTeam().id
      });

      expect(newState).toEqual(expect.objectContaining({
        teams: expectedTeams,
        teamId: storedTeam.id,
        teamName: storedTeam.name
      }));

      expect(newState).not.toBe(TEAM_INITIAL_STATE);
      expect(newState.teams).not.toBe(TEAM_INITIAL_STATE.teams);
    });

    it('should ignore the cachedTeamId when not in the team list', () => {
      const storedTeam = getStoredTeam();
      const expectedTeams = buildTeams([storedTeam]);

      const newState = team(TEAM_INITIAL_STATE, {
        type: GET_TEAMS,
        teams: expectedTeams,
        cachedTeamId: getPublicTeam().id
      });

      expect(newState).toEqual(expect.objectContaining({
        teams: expectedTeams
      }));
      expect(newState.teamId).toBeFalsy();
      expect(newState.teamName).toBeFalsy();

      expect(newState).not.toBe(TEAM_INITIAL_STATE);
      expect(newState.teams).not.toBe(TEAM_INITIAL_STATE.teams);
    });
  }); // describe('GET_TEAMS')

  describe('CHANGE_TEAM', () => {
    it('should update the current team id and name', () => {
      const state = {
        ...TEAM_INITIAL_STATE,
        teams: {} as Teams
      } as TeamState;
      state.teams = buildTeams([getStoredTeam(), newTeam]);

      const newState = team(state, {
        type: CHANGE_TEAM,
        teamId: newTeam.id
      });

      expect(newState).toEqual(expect.objectContaining({
        teamId: newTeam.id,
        teamName: newTeam.name
      }));

      expect(newState).not.toBe(state);
      expect(newState.teamId).not.toBe(state.teamId);
      expect(newState.teamName).not.toBe(state.teamName);
    });
  }); // describe('CHANGE_TEAM')

  describe('ADD_TEAM', () => {
    it('should populate an empty teams list and set the current team', () => {
      const expectedTeams = buildTeams([newTeam]);

      const newState = team(TEAM_INITIAL_STATE, {
        type: ADD_TEAM,
        team: newTeam
      });

      expect(newState).toEqual(expect.objectContaining({
        teams: expectedTeams,
        teamId: newTeam.id,
        teamName: newTeam.name
      }));

      expect(newState).not.toBe(TEAM_INITIAL_STATE);
      expect(newState.teams).not.toBe(TEAM_INITIAL_STATE.teams);
    });

    it('should add to existing teams list and set the current team', () => {
      const state: TeamState = {
        ...TEAM_INITIAL_STATE
      };
      state.teams = buildTeams([getStoredTeam()]);

      const expectedTeams = buildTeams([getStoredTeam(), newTeam]);

      const newState = team(state, {
        type: ADD_TEAM,
        team: newTeam
      });

      expect(newState).toEqual(expect.objectContaining({
        teams: expectedTeams,
        teamId: newTeam.id,
        teamName: newTeam.name
      }));

      expect(newState).not.toBe(state);
      expect(newState.teams).not.toBe(state.teams);
    });
  }); // describe('ADD_TEAM')

  describe('GET_ROSTER', () => {

    it('should set the roster to the retrieved list', () => {
      const expectedRoster = buildRoster([getStoredPlayer()]);

      const newState = team(TEAM_INITIAL_STATE, {
        type: GET_ROSTER,
        roster: expectedRoster
      });

      expect(newState).toEqual(expect.objectContaining({
        roster: expectedRoster,
      }));

      expect(newState).not.toBe(TEAM_INITIAL_STATE);
      expect(newState.roster).not.toBe(TEAM_INITIAL_STATE.roster);
    });
  }); // describe('GET_ROSTER')

  describe('ADD_PLAYER', () => {
    let newPlayer: Player;
    let existingPlayer: Player;

    beforeEach(() => {
      newPlayer = getNewPlayer();
      existingPlayer = getStoredPlayer();
    });

    it('should add new player to empty roster', () => {
      const newState = team(TEAM_INITIAL_STATE, {
        type: ADD_PLAYER,
        player: newPlayer
      });

      expect(newState).toEqual(expect.objectContaining({
        roster: buildRoster([newPlayer]),
      }));

      expect(newState).not.toBe(TEAM_INITIAL_STATE);
      expect(newState.roster).not.toBe(TEAM_INITIAL_STATE.roster);
    });

    it('should add new player to roster with existing players', () => {
      const state: TeamState = {
        ...TEAM_INITIAL_STATE
      };
      state.roster = buildRoster([existingPlayer]);

      const newState = team(state, {
        type: ADD_PLAYER,
        player: newPlayer
      });

      expect(newState).toEqual(expect.objectContaining({
        roster: buildRoster([existingPlayer, newPlayer]),
      }));

      expect(newState).not.toBe(state);
      expect(newState.roster).not.toBe(state.roster);
    });

  }); // describe('ADD_PLAYER')

});
