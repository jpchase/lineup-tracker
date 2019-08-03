import { Player } from '@app/models/player';
import { Team, Teams } from '@app/models/team';
import { ADD_PLAYER, ADD_TEAM, CHANGE_TEAM, GET_ROSTER, GET_TEAMS } from '@app/actions/team';
import team from '@app/reducers/team';
import { TeamState } from '@app/reducers/team';
import {
  buildRoster, buildTeams,
  getFakeAction,
  getNewPlayer,
  getStoredPlayer, getStoredTeam
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

  it('should handle GET_TEAMS', () => {
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

  it('should handle CHANGE_TEAM', () => {
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

  it('should handle ADD_TEAM with empty teams', () => {
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

  it('should handle ADD_TEAM with existing teams', () => {
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

  describe('GET_ROSTER', () => {

    it('should set the roster to the retrieved list', () => {
      const expectedRoster = buildRoster([getStoredPlayer()]);

      expect(
        team(TEAM_INITIAL_STATE, {
            type: GET_ROSTER,
            roster: expectedRoster
          })
      ).toEqual(expect.objectContaining({
        roster: expectedRoster,
      }));

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
