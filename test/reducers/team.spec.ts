import { Roster } from '../../src/models/roster.js';
import { GET_ROSTER } from '../../src/actions/team.js';
import team from '../../src/reducers/team.js';

describe('Roster reducer', () => {

  it('should handle GET_ROSTER', () => {
    const expectedRoster: Roster = {
      'AB': {
        id: 'AB', name: 'A Player', uniformNumber: 55, positions: ['CB'],
        status: 'OFF'
      }
    };

    expect(
      team({
        roster: {},
        error: ''
      }, {
          type: GET_ROSTER,
          roster: expectedRoster
        })
    ).toEqual(expect.objectContaining({
      roster: expectedRoster,
    }));

  });
});
