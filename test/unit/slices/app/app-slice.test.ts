import { Team } from '@app/models/team.js';
import { app, AppState, INITIAL_STATE as APP_INITIAL_STATE } from '@app/slices/app/app-slice.js';
import { addTeam, changeTeam } from '@app/slices/team/team-slice.js';
import { expect } from '@open-wc/testing';
import { getStoredTeam } from '../../helpers/test_data.js';

describe('App slice', () => {
  const newTeam: Team = {
    id: 'nt1', name: 'New team 1'
  };

  describe('team/changeTeam', () => {
    it('should update the current team id and name', () => {
      const state = {
        ...APP_INITIAL_STATE,
      } as AppState;

      const newState = app(state, changeTeam(newTeam.id, newTeam.name));

      expect(newState).to.include({
        teamId: newTeam.id,
        teamName: newTeam.name
      });

      expect(newState).to.not.equal(state);
      expect(newState.teamId).to.not.equal(state.teamId);
      expect(newState.teamName).to.not.equal(state.teamName);
    });

    it('should do nothing if team id already set as current team', () => {
      const storedTeam = getStoredTeam();
      const state = {
        ...APP_INITIAL_STATE,
        teamId: storedTeam.id,
        teamName: storedTeam.name
      } as AppState;

      const newState = app(state, changeTeam(storedTeam.id, storedTeam.name));

      expect(newState).to.equal(state);
    });

  }); // describe('team/changeTeam')

  describe('team/addTeam', () => {
    it('should set the current team', () => {
      const newState = app(APP_INITIAL_STATE, addTeam(newTeam));

      expect(newState).to.deep.include({
        teamId: newTeam.id,
        teamName: newTeam.name
      });

      expect(newState).to.not.equal(APP_INITIAL_STATE);
    });
  }); // describe('team/addTeam')

});
