import * as actions from '@app/actions/app';

describe('App actions', () => {

  describe('navigate', () => {
    it('should return a function to dispatch the navigate action', () => {
      expect(typeof actions.navigate()).toBe('function');
    });

  }); // describe('navigate')

}); // describe('App actions')
