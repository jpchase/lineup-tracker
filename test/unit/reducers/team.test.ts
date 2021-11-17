import { Player } from '@app/models/player';
import { Team, Teams } from '@app/models/team';
import { ADD_PLAYER, ADD_TEAM, CHANGE_TEAM, GET_ROSTER, GET_TEAMS } from '@app/slices/team-types';
import team from '@app/reducers/team';
import { TeamState } from '@app/reducers/team';
import { expect } from '@open-wc/testing';
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
    ).to.equal(TEAM_INITIAL_STATE);
  });

  it('should return the initial state when none provided', () => {
    expect(
      team(undefined, getFakeAction())
    ).to.deep.equal(TEAM_INITIAL_STATE);
  });

  describe('GET_TEAMS', () => {
    it('should set the teams state to the retrieved list', () => {
      const expectedTeams = buildTeams([getStoredTeam()]);

      const newState = team(TEAM_INITIAL_STATE, {
        type: GET_TEAMS,
        payload: {
          teams: expectedTeams
        }
      });

      expect(newState).to.deep.include({
        teams: expectedTeams,
      });

      expect(newState).to.not.equal(TEAM_INITIAL_STATE);
      expect(newState.teams).to.not.equal(TEAM_INITIAL_STATE.teams);
    });

    it('should set the current team when cachedTeamId provided', () => {
      const storedTeam = getStoredTeam();
      const expectedTeams = buildTeams([storedTeam, getPublicTeam()]);

      const newState = team(TEAM_INITIAL_STATE, {
        type: GET_TEAMS,
        payload: {
          teams: expectedTeams,
          cachedTeamId: storedTeam.id
        }
      });

      expect(newState).to.deep.include({
        teams: expectedTeams,
        teamId: storedTeam.id,
        teamName: storedTeam.name
      });

      expect(newState).to.not.equal(TEAM_INITIAL_STATE);
      expect(newState.teams).to.not.equal(TEAM_INITIAL_STATE.teams);
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
        payload: {
          teams: expectedTeams,
          cachedTeamId: getPublicTeam().id
        }
      });

      expect(newState).to.deep.include({
        teams: expectedTeams,
        teamId: storedTeam.id,
        teamName: storedTeam.name
      });

      expect(newState).to.not.equal(TEAM_INITIAL_STATE);
      expect(newState.teams).to.not.equal(TEAM_INITIAL_STATE.teams);
    });

    it('should ignore the cachedTeamId when not in the team list', () => {
      const storedTeam = getStoredTeam();
      const expectedTeams = buildTeams([storedTeam]);

      const newState = team(TEAM_INITIAL_STATE, {
        type: GET_TEAMS,
        payload: {
          teams: expectedTeams,
          cachedTeamId: getPublicTeam().id
        }
      });

      expect(newState).to.include({
        teams: expectedTeams
      });
      expect(newState.teamId).to.not.be.ok;
      expect(newState.teamName).to.not.be.ok;

      expect(newState).to.not.equal(TEAM_INITIAL_STATE);
      expect(newState.teams).to.not.equal(TEAM_INITIAL_STATE.teams);
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
        payload: { teamId: newTeam.id }
      });

      expect(newState).to.include({
        teamId: newTeam.id,
        teamName: newTeam.name
      });

      expect(newState).to.not.equal(state);
      expect(newState.teamId).to.not.equal(state.teamId);
      expect(newState.teamName).to.not.equal(state.teamName);
    });

    it('should do nothing if no teams exist', () => {
      const state = {
        ...TEAM_INITIAL_STATE,
        teams: {} as Teams
      } as TeamState;

      const newState = team(state, {
        type: CHANGE_TEAM,
        payload: { teamId: getStoredTeam().id }
      });

      expect(newState).to.equal(state);
    });

    it('should do nothing if team id does not exist', () => {
      const state = {
        ...TEAM_INITIAL_STATE,
        teams: {} as Teams
      } as TeamState;
      state.teams = buildTeams([getStoredTeam(), newTeam]);

      const newState = team(state, {
        type: CHANGE_TEAM,
        payload: { teamId: 'nosuchid' }
      });

      expect(newState).to.equal(state);
    });

    it('should do nothing if team id already set as current team', () => {
      const storedTeam = getStoredTeam();
      const state = {
        ...TEAM_INITIAL_STATE,
        teamId: storedTeam.id,
        teamName: storedTeam.name,
        teams: {} as Teams
      } as TeamState;
      state.teams = buildTeams([storedTeam]);

      const newState = team(state, {
        type: CHANGE_TEAM,
        payload: { teamId: storedTeam.id }
      });

      expect(newState).to.equal(state);
    });

  }); // describe('CHANGE_TEAM')

  describe('ADD_TEAM', () => {
    it('should populate an empty teams list and set the current team', () => {
      const expectedTeams = buildTeams([newTeam]);

      const newState = team(TEAM_INITIAL_STATE, {
        type: ADD_TEAM,
        payload: newTeam
      });

      expect(newState).to.deep.include({
        teams: expectedTeams,
        teamId: newTeam.id,
        teamName: newTeam.name
      });

      expect(newState).to.not.equal(TEAM_INITIAL_STATE);
      expect(newState.teams).to.not.equal(TEAM_INITIAL_STATE.teams);
    });

    it('should add to existing teams list and set the current team', () => {
      const state: TeamState = {
        ...TEAM_INITIAL_STATE
      };
      state.teams = buildTeams([getStoredTeam()]);

      const expectedTeams = buildTeams([getStoredTeam(), newTeam]);

      const newState = team(state, {
        type: ADD_TEAM,
        payload: newTeam
      });

      expect(newState).to.deep.include({
        teams: expectedTeams,
        teamId: newTeam.id,
        teamName: newTeam.name
      });

      expect(newState).to.not.equal(state);
      expect(newState.teams).to.not.equal(state.teams);
    });
  }); // describe('ADD_TEAM')

  describe('GET_ROSTER', () => {

    it('should set the roster to the retrieved list', () => {
      const expectedRoster = buildRoster([getStoredPlayer()]);

      const newState = team(TEAM_INITIAL_STATE, {
        type: GET_ROSTER,
        payload: expectedRoster
      });

      expect(newState).to.deep.include({
        roster: expectedRoster,
      });

      expect(newState).to.not.equal(TEAM_INITIAL_STATE);
      expect(newState.roster).to.not.equal(TEAM_INITIAL_STATE.roster);
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
        payload: newPlayer
      });

      expect(newState).to.deep.include({
        roster: buildRoster([newPlayer]),
      });

      expect(newState).to.not.equal(TEAM_INITIAL_STATE);
      expect(newState.roster).to.not.equal(TEAM_INITIAL_STATE.roster);
    });

    it('should add new player to roster with existing players', () => {
      const state: TeamState = {
        ...TEAM_INITIAL_STATE
      };
      state.roster = buildRoster([existingPlayer]);

      const newState = team(state, {
        type: ADD_PLAYER,
        payload: newPlayer
      });

      expect(newState).to.deep.include({
        roster: buildRoster([existingPlayer, newPlayer]),
      });

      expect(newState).to.not.equal(state);
      expect(newState.roster).to.not.equal(state.roster);
    });

  }); // describe('ADD_PLAYER')

});
