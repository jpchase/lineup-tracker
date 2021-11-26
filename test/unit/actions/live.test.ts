import * as actions from '@app/actions/live';
import { Position } from '@app/models/formation';
import { LivePlayer } from '@app/models/game';
import { LiveState } from '@app/slices/live/live-slice';
import * as actionTypes from '@app/slices/live-types';
import { RootState } from '@app/store';
import { expect } from '@open-wc/testing';
import sinon from 'sinon';
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
      const selectedPosition: Position = { id: 'AM1', type: 'AM' };
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
      const selectedPosition: Position = { id: 'AM1', type: 'AM' };
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
      const selectedPosition: Position = { id: 'AM1', type: 'AM' };
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
      const selectedPosition: Position = { id: 'AM1', type: 'AM' };
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
