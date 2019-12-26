import * as actions from '@app/actions/live';
import * as actionTypes from '@app/slices/live-game-types';
import { expect } from '@open-wc/testing';
import * as sinon from 'sinon';

describe('Live actions', () => {

  describe('selectPlayer', () => {
    it('should return a function to dispatch the selectPlayer action', () => {
      expect(actions.selectPlayer()).to.be.instanceof(Function);
    });

    it('should do nothing if player input is missing', () => {
      const dispatchMock = sinon.stub();
      const getStateMock = sinon.stub();

      actions.selectPlayer()(dispatchMock, getStateMock, undefined);

      expect(getStateMock).to.not.have.been.called;

      expect(dispatchMock).to.not.have.been.called;
    });

    it('should dispatch an action to select the player', () => {
      const dispatchMock = sinon.stub();
      const getStateMock = sinon.stub();

      actions.selectPlayer('player id')(dispatchMock, getStateMock, undefined);

      expect(dispatchMock).to.have.been.calledWith({
        type: actionTypes.SELECT_PLAYER,
        playerId: 'player id'
      });
    });
  }); // describe('selectPlayer')

}); // describe('Live actions')
