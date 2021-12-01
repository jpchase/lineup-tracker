import { Duration } from '@app/models/clock';
import { clock, ClockState, endPeriod, startPeriod, toggle } from '@app/slices/live/clock-slice';
import { expect } from '@open-wc/testing';
import sinon from 'sinon';

export const CLOCK_INITIAL_STATE: ClockState = {
  timer: undefined,
};

describe('Clock reducer', () => {
  const startTime = new Date(2016, 0, 1, 14, 0, 0).getTime();
  const time1 = new Date(2016, 0, 1, 14, 0, 5).getTime();
  const time2 = new Date(2016, 0, 1, 14, 0, 10).getTime();
  const time3 = new Date(2016, 0, 1, 14, 1, 55).getTime();
  let fakeClock: sinon.SinonFakeTimers;

  afterEach(async () => {
    sinon.restore();
    if (fakeClock) {
      fakeClock.restore();
    }
  });

  function mockTimeProvider(t0: number) {
    fakeClock = sinon.useFakeTimers({ now: t0 });
  }

  describe('clock/startPeriod', () => {
    let currentState: ClockState = CLOCK_INITIAL_STATE;

    beforeEach(() => {
      currentState = {
        ...CLOCK_INITIAL_STATE,
      };
    });

    it('should set the clock running and capture the start time', () => {
      mockTimeProvider(startTime);

      const newState = clock(currentState, {
        type: startPeriod.type
      });

      expect(newState).to.deep.include({
        timer: {
          isRunning: true,
          startTime: startTime,
          duration: Duration.zero().toJSON()
        }
      });

      expect(newState).not.to.equal(currentState);
      expect(newState.timer).not.to.equal(currentState.timer);
    });
  }); // describe('clock/startPeriod')

  describe('clock/endPeriod', () => {

    it('should stop the clock and save the duration', () => {
      mockTimeProvider(time2);
      const currentState: ClockState = {
        ...CLOCK_INITIAL_STATE,
        timer: {
          isRunning: true,
          startTime: startTime,
          duration: Duration.zero().toJSON()
        }
      };

      const newState = clock(currentState, {
        type: endPeriod.type
      });

      expect(newState).to.deep.include({
        timer: {
          isRunning: false,
          startTime: undefined,
          duration: Duration.create(10).toJSON()
        }
      });

      expect(newState).not.to.equal(currentState);
      expect(newState.timer).not.to.equal(currentState.timer);
    });
  }); // describe('clock/endPeriod')

  describe('clock/toggle', () => {
    let currentState: ClockState;

    beforeEach(() => {
      currentState = {
        ...CLOCK_INITIAL_STATE,
      };
    });

    it('should start when no timer data exists', () => {
      expect(currentState.timer).to.be.undefined;
      mockTimeProvider(time3);

      const newState = clock(currentState, {
        type: toggle.type
      });

      expect(newState).to.deep.include({
        timer: {
          isRunning: true,
          startTime: time3,
          duration: Duration.zero().toJSON()
        }
      });

      expect(newState).not.to.equal(currentState);
      expect(newState.timer).not.to.equal(currentState.timer);
    });

    it('should start when timer is set to not running', () => {
      mockTimeProvider(startTime);
      currentState.timer = {
        isRunning: false,
        startTime: undefined,
        duration: undefined
      };

      const newState = clock(currentState, {
        type: toggle.type
      });

      expect(newState).to.deep.include({
        timer: {
          isRunning: true,
          startTime: startTime,
          duration: Duration.zero().toJSON()
        }
      });

      expect(newState).not.to.equal(currentState);
      expect(newState.timer).not.to.equal(currentState.timer);
    });

    it('should stop when timer is already running', () => {
      mockTimeProvider(time2);
      currentState.timer = {
        isRunning: true,
        startTime: time1,
        duration: Duration.zero().toJSON()
      };

      const newState = clock(currentState, {
        type: toggle.type
      });

      expect(newState).to.deep.include({
        timer: {
          isRunning: false,
          startTime: undefined,
          duration: Duration.create(5).toJSON()
        }
      });

      expect(newState).not.to.equal(currentState);
      expect(newState.timer).not.to.equal(currentState.timer);
    });

    it('should stop when running and add to existing duration', () => {
      mockTimeProvider(time2);
      currentState.timer = {
        isRunning: true,
        startTime: startTime,
        duration: Duration.create(20).toJSON()
      };

      const newState = clock(currentState, {
        type: toggle.type
      });

      expect(newState).to.deep.include({
        timer: {
          isRunning: false,
          startTime: undefined,
          duration: Duration.create(30).toJSON()
        }
      });

      expect(newState).not.to.equal(currentState);
      expect(newState.timer).not.to.equal(currentState.timer);
    });
  }); // describe('clock/toggle')
});
