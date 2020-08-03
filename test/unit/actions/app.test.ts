import * as actions from '@app/actions/app';
import { expect } from '@open-wc/testing';

describe('App actions', () => {

  describe('navigate', () => {
    it('should return a function to dispatch the navigate action', () => {
      expect(actions.navigate()).to.be.instanceof(Function);
    });

  }); // describe('navigate')

}); // describe('App actions')
