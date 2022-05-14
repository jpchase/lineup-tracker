import { Duration } from '@app/models/clock.js';
import { PeriodStatus } from '@app/models/live.js';
import { clock, ClockState, configurePeriods, endPeriod, startPeriod, toggle } from '@app/slices/live/clock-slice.js';
import { expect } from '@open-wc/testing';
import sinon from 'sinon';
import { buildRunningTimer, buildStoppedTimer } from '../../helpers/test-clock-data.js';

export const CLOCK_INITIAL_STATE: ClockState = {
  timer: undefined,
  currentPeriod: 0,
  periodStatus: PeriodStatus.Pending,
  totalPeriods: 2,
  periodLength: 45
};

export function buildClockWithTimer(isRunning?: boolean): ClockState {
  return {
    ...CLOCK_INITIAL_STATE,
    timer: isRunning ? buildRunningTimer() : buildStoppedTimer(),
  }
}

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

  describe('clock/configurePeriods', () => {
    let currentState: ClockState = CLOCK_INITIAL_STATE;

    beforeEach(() => {
      currentState = {
        ...CLOCK_INITIAL_STATE,
      };
    });

    it('should set the period total/length', () => {
      const newState = clock(currentState,
        configurePeriods(/*totalPeriods=*/1, /*periodLength=*/20));

      expect(newState).to.deep.include({
        totalPeriods: 1,
        periodLength: 20
      });

      expect(newState).not.to.equal(currentState);
    });

    it('should do nothing if totalPeriods is invalid', () => {
      const newState = clock(currentState,
        configurePeriods(/*totalPeriods=*/0, /*periodLength=*/45));

      expect(newState).to.equal(currentState);
    });

    it('should do nothing if periodLength is invalid', () => {
      const newState = clock(currentState,
        configurePeriods(/*totalPeriods=*/2, /*periodLength=*/5));

      expect(newState).to.equal(currentState);
    });

    it('should do nothing if already started', () => {
      currentState.periodStatus = PeriodStatus.Running;

      const newState = clock(currentState,
        configurePeriods(/*totalPeriods=*/2, /*periodLength=*/35));

      expect(newState).to.equal(currentState);
    });

    it('should do nothing if already on period 1', () => {
      currentState.currentPeriod = 1;

      const newState = clock(currentState,
        configurePeriods(/*totalPeriods=*/2, /*periodLength=*/35));

      expect(newState).to.equal(currentState);
    });
  }); // describe('clock/configurePeriods')

  describe('clock/startPeriod', () => {
    let currentState: ClockState = CLOCK_INITIAL_STATE;

    beforeEach(() => {
      currentState = {
        ...CLOCK_INITIAL_STATE,
      };
    });

    it('should set the clock running and capture the start time', () => {
      mockTimeProvider(startTime);

      const newState = clock(currentState, startPeriod(/*gameAllowsStart=*/true));

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

    it('should start the first period when currentPeriod not set', () => {
      mockTimeProvider(startTime);

      const newState = clock(currentState, startPeriod(/*gameAllowsStart=*/true));

      expect(newState).to.deep.include({
        currentPeriod: 1,
        periodStatus: PeriodStatus.Running
      });

      expect(newState).not.to.equal(currentState);
    });

    it('should start the next period when currentPeriod already set', () => {
      mockTimeProvider(startTime);
      currentState.currentPeriod = 1;

      const newState = clock(currentState, startPeriod(/*gameAllowsStart=*/true));

      expect(newState).to.deep.include({
        currentPeriod: 2,
        periodStatus: PeriodStatus.Running
      });

      expect(newState).not.to.equal(currentState);
    });

    it('should do nothing if already at last period', () => {
      mockTimeProvider(startTime);
      currentState.currentPeriod = 2;
      currentState.totalPeriods = 2;

      const newState = clock(currentState, startPeriod(/*gameAllowsStart=*/true));

      expect(newState).to.deep.include({
        currentPeriod: 2,
        periodStatus: PeriodStatus.Pending
      });

      expect(newState).to.equal(currentState);
    });

    it('should do nothing if game does not allow period to be started', () => {
      mockTimeProvider(startTime);

      const newState = clock(currentState, startPeriod(/*gameAllowsStart=*/false));

      expect(newState).to.deep.include({
        currentPeriod: 0,
        periodStatus: PeriodStatus.Pending
      });

      expect(newState).to.equal(currentState);
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

      const newState = clock(currentState, endPeriod());

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

    it('should reset the period status', () => {
      mockTimeProvider(time2);
      const currentState: ClockState = {
        ...CLOCK_INITIAL_STATE,
        currentPeriod: 1,
        periodStatus: PeriodStatus.Running
      };

      const newState = clock(currentState, endPeriod());

      expect(newState).to.deep.include({
        currentPeriod: 1,
        periodStatus: PeriodStatus.Pending
      });

      expect(newState).not.to.equal(currentState);
    });

    it('should reset the period status when timer is not running', () => {
      mockTimeProvider(time2);
      const currentState: ClockState = {
        ...CLOCK_INITIAL_STATE,
        currentPeriod: 1,
        periodStatus: PeriodStatus.Running,
        timer: {
          isRunning: false,
          startTime: startTime,
          duration: Duration.zero().toJSON()
        }
      };

      const newState = clock(currentState, endPeriod());

      expect(newState).to.deep.include({
        currentPeriod: 1,
        periodStatus: PeriodStatus.Pending,
      });

      expect(newState).not.to.equal(currentState);
    });

    it('should set the period status to done when on the last period', () => {
      mockTimeProvider(time2);
      const currentState: ClockState = {
        ...CLOCK_INITIAL_STATE,
        currentPeriod: 3,
        periodStatus: PeriodStatus.Running,
        totalPeriods: 3
      };

      const newState = clock(currentState, endPeriod());

      expect(newState).to.deep.include({
        currentPeriod: 3,
        periodStatus: PeriodStatus.Done
      });

      expect(newState).not.to.equal(currentState);
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

      const newState = clock(currentState, toggle());

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

      const newState = clock(currentState, toggle());

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

      const newState = clock(currentState, toggle());

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

      const newState = clock(currentState, toggle());

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

    it('should not change the period when timer is set to not running', () => {
      mockTimeProvider(startTime);
      currentState.currentPeriod = 1;
      currentState.periodStatus = PeriodStatus.Running;
      currentState.timer = {
        isRunning: false,
        startTime: undefined,
        duration: undefined
      };

      const newState = clock(currentState, toggle());

      expect(newState).to.deep.include({
        currentPeriod: 1,
        periodStatus: PeriodStatus.Running,
      });

      expect(newState).not.to.equal(currentState);
      // Check the timer to make sure the toggle happened, but the values don't
      // matter for this test.
      expect(newState.timer).not.to.equal(currentState.timer);
    });

    it('should not change the period when timer is already running', () => {
      mockTimeProvider(time2);
      currentState.currentPeriod = 2;
      currentState.periodStatus = PeriodStatus.Running;
      currentState.timer = {
        isRunning: true,
        startTime: time1,
        duration: Duration.zero().toJSON()
      };

      const newState = clock(currentState, toggle());

      expect(newState).to.deep.include({
        currentPeriod: 2,
        periodStatus: PeriodStatus.Running,
      });

      expect(newState).not.to.equal(currentState);
      // Check the timer to make sure the toggle happened, but the values don't
      // matter for this test.
      expect(newState.timer).not.to.equal(currentState.timer);
    });

  }); // describe('clock/toggle')
});
