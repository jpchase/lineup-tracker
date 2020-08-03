import * as actions from '@app/actions/live';
import { Position } from '@app/models/formation';
import { LivePlayer } from '@app/models/game';
import { LiveState } from '@app/reducers/live';
import * as actionTypes from '@app/slices/live-types';
import { RootState } from '@app/store';
import { expect } from '@open-wc/testing';
import * as sinon from 'sinon';
import { getMockAuthState, getStoredPlayer } from '../helpers/test_data';

interface MockStateUpdateFunc {
  (state: LiveState): void;
}

function mockGetState(updateFn?: MockStateUpdateFunc) {
  return sinon.fake(() => {
    const mockState: RootState = {
      auth: getMockAuthState(),
      live: {
        gameId: '',
      },
    };
    if (updateFn) {
      updateFn(mockState.live!);
    }
    return mockState;
  });
}

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

      actions.selectPlayer('player id', true)(dispatchMock, getStateMock, undefined);

      expect(dispatchMock).to.have.been.calledWith({
        type: actionTypes.SELECT_PLAYER,
        playerId: 'player id',
        selected: true
      });
    });

    it('should dispatch an action to de-select the player', () => {
      const dispatchMock = sinon.stub();
      const getStateMock = sinon.stub();

      actions.selectPlayer('player id')(dispatchMock, getStateMock, undefined);

      expect(dispatchMock).to.have.been.calledWith({
        type: actionTypes.SELECT_PLAYER,
        playerId: 'player id',
        selected: false
      });
    });
  }); // describe('selectPlayer')

  describe('confirmProposedSub', () => {
    it('should return a function to dispatch the confirmProposedSub action', () => {
      expect(actions.confirmProposedSub()).to.be.instanceof(Function);
    });

    it('should do nothing if proposed sub is missing', () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState();

      actions.confirmProposedSub()(dispatchMock, getStateMock, undefined);

      expect(dispatchMock).to.not.have.been.called;
    });

    it('should dispatch an action to confirm the proposed sub', () => {
      const selectedPosition: Position = { id: 'AM1', type: 'AM'};
      const sub: LivePlayer = {
        ...getStoredPlayer(),
        currentPosition: { ...selectedPosition },
        replaces: 'foo'
      }

      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState((liveState) => {
        liveState.proposedSub = sub;
      });

      actions.confirmProposedSub()(dispatchMock, getStateMock, undefined);

      expect(dispatchMock).to.have.been.calledWith({
        type: actionTypes.CONFIRM_SUB
      });
    });
  }); // describe('confirmProposedSub')

  describe('cancelProposedSub', () => {
    it('should return a function to dispatch the cancelProposedSub action', () => {
      expect(actions.cancelProposedSub()).to.be.instanceof(Function);
    });

    it('should do nothing if proposed sub is missing', () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState();

      actions.cancelProposedSub()(dispatchMock, getStateMock, undefined);

      expect(dispatchMock).to.not.have.been.called;
    });

    it('should dispatch an action to cancel the proposed sub', () => {
      const selectedPosition: Position = { id: 'AM1', type: 'AM'};
      const sub: LivePlayer = {
        ...getStoredPlayer(),
        currentPosition: { ...selectedPosition },
        replaces: 'foo'
      }

      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState((liveState) => {
        liveState.proposedSub = sub;
      });

      actions.cancelProposedSub()(dispatchMock, getStateMock, undefined);

      expect(dispatchMock).to.have.been.calledWith({
        type: actionTypes.CANCEL_SUB
      });
    });
  }); // describe('cancelProposedSub')

  describe('applyPendingSubs', () => {
    it('should return a function to dispatch the applyPendingSubs action', () => {
      expect(actions.applyPendingSubs()).to.be.instanceof(Function);
    });

    it('should dispatch an action to apply the pending sub', () => {
      const dispatchMock = sinon.stub();
      const getStateMock = sinon.stub();

      actions.applyPendingSubs()(dispatchMock, getStateMock, undefined);

      expect(dispatchMock).to.have.been.calledWith({
        type: actionTypes.APPLY_NEXT,
        selectedOnly: false
      });
    });

    it('should dispatch an action, with selected only, to apply the pending sub', () => {
      const dispatchMock = sinon.stub();
      const getStateMock = sinon.stub();

      actions.applyPendingSubs(true)(dispatchMock, getStateMock, undefined);

      expect(dispatchMock).to.have.been.calledWith({
        type: actionTypes.APPLY_NEXT,
        selectedOnly: true
      });
    });
  }); // describe('applyPendingSubs')

  describe('discardPendingSubs', () => {
    it('should return a function to dispatch the discardPendingSubs action', () => {
      expect(actions.discardPendingSubs()).to.be.instanceof(Function);
    });

    it('should dispatch an action to discard the pending subs', () => {
      const dispatchMock = sinon.stub();
      const getStateMock = sinon.stub();

      actions.discardPendingSubs()(dispatchMock, getStateMock, undefined);

      expect(dispatchMock).to.have.been.calledWith({
        type: actionTypes.DISCARD_NEXT,
        selectedOnly: false
      });
    });

    it('should dispatch an action, with selected only, to discard the pending sub', () => {
      const dispatchMock = sinon.stub();
      const getStateMock = sinon.stub();

      actions.discardPendingSubs(true)(dispatchMock, getStateMock, undefined);

      expect(dispatchMock).to.have.been.calledWith({
        type: actionTypes.DISCARD_NEXT,
        selectedOnly: true
      });
    });
  }); // describe('discardPendingSubs')

  describe('selectStarter', () => {
    it('should return a function to dispatch the selectStarter action', () => {
      expect(actions.selectStarter()).to.be.instanceof(Function);
    });

    it('should do nothing if player input is missing', () => {
      const dispatchMock = sinon.stub();
      const getStateMock = sinon.stub();

      actions.selectStarter()(dispatchMock, getStateMock, undefined);

      expect(getStateMock).to.not.have.been.called;

      expect(dispatchMock).to.not.have.been.called;
    });

    it('should dispatch an action to select the starter', () => {
      const dispatchMock = sinon.stub();
      const getStateMock = sinon.stub();

      actions.selectStarter('player id', true)(dispatchMock, getStateMock, undefined);

      expect(dispatchMock).to.have.been.calledWith({
        type: actionTypes.SELECT_STARTER,
        playerId: 'player id',
        selected: true
      });
    });

    it('should dispatch an action to de-select the starter', () => {
      const dispatchMock = sinon.stub();
      const getStateMock = sinon.stub();

      actions.selectStarter('player id')(dispatchMock, getStateMock, undefined);

      expect(dispatchMock).to.have.been.calledWith({
        type: actionTypes.SELECT_STARTER,
        playerId: 'player id',
        selected: false
      });
    });
  }); // describe('selectStarter')

  describe('selectStarterPosition', () => {
    it('should return a function to dispatch the selectStarterPosition action', () => {
      expect(actions.selectStarterPosition()).to.be.instanceof(Function);
    });

    it('should do nothing if position input is missing', () => {
      const dispatchMock = sinon.stub();
      const getStateMock = sinon.stub();

      actions.selectStarterPosition()(dispatchMock, getStateMock, undefined);

      expect(getStateMock).to.not.have.been.called;

      expect(dispatchMock).to.not.have.been.called;
    });

    it('should dispatch an action to select the starter position', () => {
      const dispatchMock = sinon.stub();
      const getStateMock = sinon.stub();

      const position: Position = { id: 'AM1', type: 'AM' };
      actions.selectStarterPosition(position)(dispatchMock, getStateMock, undefined);

      expect(dispatchMock).to.have.been.calledWith({
        type: actionTypes.SELECT_STARTER_POSITION,
        position: position
      });
    });
  }); // describe('selectStarterPosition')

  describe('applyProposedStarter', () => {
    it('should return a function to dispatch the applyProposedStarter action', () => {
      expect(actions.applyProposedStarter()).to.be.instanceof(Function);
    });

    it('should do nothing if proposed starter is missing', () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState();

      actions.applyProposedStarter()(dispatchMock, getStateMock, undefined);

      expect(dispatchMock).to.not.have.been.called;
    });

    it('should dispatch an action to apply the proposed starter', () => {
      const selectedPosition: Position = { id: 'AM1', type: 'AM'};
      const starter: LivePlayer = {
        ...getStoredPlayer(),
        currentPosition: { ...selectedPosition }
      }

      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState((liveState) => {
        liveState.selectedStarterPlayer = 'foo';
        liveState.selectedStarterPosition = { id: 'id', type: 'foo' };
        liveState.proposedStarter = starter;
      });

      actions.applyProposedStarter()(dispatchMock, getStateMock, undefined);

      expect(dispatchMock).to.have.been.calledWith({
        type: actionTypes.APPLY_STARTER
      });
    });
  }); // describe('applyProposedStarter')

  describe('cancelProposedStarter', () => {
    it('should return a function to dispatch the cancelProposedStarter action', () => {
      expect(actions.cancelProposedStarter()).to.be.instanceof(Function);
    });

    it('should do nothing if proposed starter is missing', () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState();

      actions.cancelProposedStarter()(dispatchMock, getStateMock, undefined);

      expect(dispatchMock).to.not.have.been.called;
    });

    it('should dispatch an action to cancel the proposed starter', () => {
      const selectedPosition: Position = { id: 'AM1', type: 'AM'};
      const starter: LivePlayer = {
        ...getStoredPlayer(),
        currentPosition: { ...selectedPosition }
      }

      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState((liveState) => {
        liveState.selectedStarterPlayer = 'foo';
        liveState.selectedStarterPosition = { id: 'id', type: 'foo' };
        liveState.proposedStarter = starter;
      });

      actions.cancelProposedStarter()(dispatchMock, getStateMock, undefined);

      expect(dispatchMock).to.have.been.calledWith({
        type: actionTypes.CANCEL_STARTER
      });
    });
  }); // describe('cancelProposedStarter')

}); // describe('Live actions')
