import { Roster, Team, Teams } from '@app/models/team';
import { ADD_TEAM, GET_ROSTER, GET_TEAMS } from '@app/actions/team';
import team from '@app/reducers/team';
import { TeamState } from '@app/reducers/team';
import { getFakeAction } from '../helpers/test_data';

const TEAM_INITIAL_STATE: TeamState = {
  teams: {} as Teams,
  teamId: '',
  teamName: '',
  roster: {},
  error: ''
};

describe('Teams reducer', () => {
  const existingTeam: Team = {
      id: 'EX', name: 'Existing team'
  };
  const newTeam: Team = {
      id: 'nt1', name: 'New team 1'
  };

  it('should return the initial state', () => {
    expect(
      team(TEAM_INITIAL_STATE, getFakeAction())
    ).toEqual(TEAM_INITIAL_STATE);
  });

  it('should handle GET_TEAMS', () => {
    const expectedTeams = {} as Teams;
    expectedTeams[existingTeam.id] = existingTeam;

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

  it('should handle ADD_TEAM with empty teams', () => {
    const expectedTeams = {} as Teams;
    expectedTeams[newTeam.id] = newTeam;

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
    state.teams[existingTeam.id] = existingTeam;

    const expectedTeams = {} as Teams;
    expectedTeams[existingTeam.id] = existingTeam;
    expectedTeams[newTeam.id] = newTeam;

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

});

describe('Roster reducer', () => {

  it('should return the initial state', () => {
    expect(
      team(TEAM_INITIAL_STATE, getFakeAction())
    ).toEqual(TEAM_INITIAL_STATE);
  });

  it('should handle GET_ROSTER', () => {
    const expectedRoster: Roster = {
      'AB': {
        id: 'AB', name: 'A Player', uniformNumber: 55, positions: ['CB'],
        status: 'OFF'
      }
    };

    expect(
      team(TEAM_INITIAL_STATE, {
          type: GET_ROSTER,
          roster: expectedRoster
        })
    ).toEqual(expect.objectContaining({
      roster: expectedRoster,
    }));

  });
});
