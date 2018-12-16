import { Roster, Team } from '@app/models/team';
import { GET_ROSTER, GET_TEAMS } from '@app/actions/team';
import team from '@app/reducers/team';
import { TeamState } from '@app/reducers/team';
import { getFakeAction } from '../helpers/test_data';

const TEAM_INITIAL_STATE: TeamState = {
  teams: [],
  teamId: '',
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
        id: 'U16A', name: 'Waterloo U16A'
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
