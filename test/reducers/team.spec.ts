import { Roster, Team } from '@app/models/team';
import { ADD_TEAM, GET_ROSTER, GET_TEAMS } from '@app/actions/team';
import team from '@app/reducers/team';
import { TeamState } from '@app/reducers/team';
import { getFakeAction } from '../helpers/test_data';

const TEAM_INITIAL_STATE: TeamState = {
  teams: [],
  teamId: '',
  teamName: '',
  roster: {},
  error: ''
};

describe('Teams reducer', () => {

  it('should return the initial state', () => {
    expect(
      team(TEAM_INITIAL_STATE, getFakeAction())
    ).toEqual(TEAM_INITIAL_STATE);
  });

  it('should handle GET_TEAMS', () => {
    const expectedTeams: Team[] = [
      {
        id: 'EX', name: 'Existing team'
      }
    ];

    expect(
      team(TEAM_INITIAL_STATE, {
        type: GET_TEAMS,
        teams: expectedTeams
      })
    ).toEqual(expect.objectContaining({
      teams: expectedTeams,
    }));

  });

  it('should handle ADD_TEAM with empty teams', () => {
    const newTeam: Team = {
      id: 'nt1', name: 'New team 1'
    };

    expect(
      team(TEAM_INITIAL_STATE, {
        type: ADD_TEAM,
        team: newTeam
      })
    ).toEqual(expect.objectContaining({
      teams: [newTeam],
      teamId: newTeam.id,
      teamName: newTeam.name
    }));

  });

  it('should handle ADD_TEAM with existing teams', () => {
    const state: TeamState = {
      ...TEAM_INITIAL_STATE
    };
    state.teams = [
      {
        id: 'EX', name: 'Existing team'
      }
    ];
    const newTeam: Team = {
      id: 'nt1', name: 'New team 1'
    };

    expect(
      team(state, {
        type: ADD_TEAM,
        team: newTeam
      })
    ).toEqual(expect.objectContaining({
      teams: [...state.teams, newTeam],
      teamId: newTeam.id,
      teamName: newTeam.name
    }));

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
