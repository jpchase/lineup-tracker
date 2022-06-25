import { Duration } from '@app/models/clock.js';
import { PeriodStatus } from '@app/models/live.js';
import { configurePeriods, endPeriod, startPeriod, toggle } from '@app/slices/live/clock-reducer-logic.js';
import { live, LiveState } from '@app/slices/live/live-slice.js';
import { expect } from '@open-wc/testing';
import sinon from 'sinon';
import { buildClock, buildClockWithTimer, buildLiveStateWithCurrentGame, buildShiftWithTrackers } from '../../helpers/live-state-setup.js';
import { buildRunningTimer, buildStoppedTimer } from '../../helpers/test-clock-data.js';
import * as testlive from '../../helpers/test-live-game-data.js';

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
    let currentState: LiveState;

    beforeEach(() => {
      currentState = buildLiveStateWithCurrentGame(
        testlive.getLiveGameWithPlayers(),
        {
          clock: buildClockWithTimer(),
        });
    });

    it('should set the period total/length', () => {
      const newState = live(currentState,
        configurePeriods(/*totalPeriods=*/1, /*periodLength=*/20));

      expect(newState.clock).to.deep.include({
        totalPeriods: 1,
        periodLength: 20
      });

      expect(newState).not.to.equal(currentState);
    });

    it('should do nothing if totalPeriods is invalid', () => {
      const newState = live(currentState,
        configurePeriods(/*totalPeriods=*/0, /*periodLength=*/45));

      expect(newState).to.equal(currentState);
    });

    it('should do nothing if periodLength is invalid', () => {
      const newState = live(currentState,
        configurePeriods(/*totalPeriods=*/2, /*periodLength=*/5));

      expect(newState).to.equal(currentState);
    });

    it('should do nothing if already started', () => {
      currentState.clock!.periodStatus = PeriodStatus.Running;

      const newState = live(currentState,
        configurePeriods(/*totalPeriods=*/2, /*periodLength=*/35));

      expect(newState).to.equal(currentState);
    });

    it('should do nothing if already on period 1', () => {
      currentState.clock!.currentPeriod = 1;

      const newState = live(currentState,
        configurePeriods(/*totalPeriods=*/2, /*periodLength=*/35));

      expect(newState).to.equal(currentState);
    });
  }); // describe('clock/configurePeriods')

  describe('clock/startPeriod', () => {
    let currentState: LiveState;

    beforeEach(() => {
      currentState = buildLiveStateWithCurrentGame(
        testlive.getLiveGameWithPlayers(),
        {
          shift: buildShiftWithTrackers()
        });
    });

    it('should set the clock running and capture the start time', () => {
      mockTimeProvider(startTime);

      const newState = live(currentState, startPeriod(/*gameAllowsStart=*/true));

      expect(newState.clock).to.deep.include({
        timer: {
          isRunning: true,
          startTime: startTime,
          duration: Duration.zero().toJSON()
        }
      });

      expect(newState).not.to.equal(currentState);
      expect(newState.clock?.timer).not.to.equal(currentState.clock?.timer);
    });

    it('should start the first period when currentPeriod not set', () => {
      mockTimeProvider(startTime);

      const newState = live(currentState, startPeriod(/*gameAllowsStart=*/true));

      expect(newState.clock).to.deep.include({
        currentPeriod: 1,
        periodStatus: PeriodStatus.Running
      });

      expect(newState).not.to.equal(currentState);
    });

    it('should start the next period when currentPeriod already set', () => {
      mockTimeProvider(startTime);
      currentState.clock!.currentPeriod = 1;

      const newState = live(currentState, startPeriod(/*gameAllowsStart=*/true));

      expect(newState.clock).to.deep.include({
        currentPeriod: 2,
        periodStatus: PeriodStatus.Running
      });

      expect(newState).not.to.equal(currentState);
    });

    it.skip('should do nothing if already at last period', () => {
      mockTimeProvider(startTime);
      currentState.clock!.currentPeriod = 2;
      currentState.clock!.totalPeriods = 2;

      const newState = live(currentState, startPeriod(/*gameAllowsStart=*/true));

      expect(newState.clock).to.deep.include({
        currentPeriod: 2,
        periodStatus: PeriodStatus.Pending
      });

      // TODO: Move the "at last period" check into the creator that sets |gameAllowsStart|
      // Also add a test.
      expect(newState).to.equal(currentState);
    });

    it('should do nothing if game does not allow period to be started', () => {
      mockTimeProvider(startTime);

      const newState = live(currentState, startPeriod(/*gameAllowsStart=*/false));

      expect(newState.clock).to.deep.include({
        currentPeriod: 0,
        periodStatus: PeriodStatus.Pending
      });

      expect(newState).to.equal(currentState);
    });

  }); // describe('clock/startPeriod')

  describe('clock/endPeriod', () => {
    let currentState: LiveState;

    beforeEach(() => {
      currentState = buildLiveStateWithCurrentGame(
        testlive.getLiveGameWithPlayers());
    });

    it('should stop the clock and save the duration', () => {
      mockTimeProvider(time2);
      currentState.clock = buildClock(
        buildRunningTimer(startTime),
        {
          currentPeriod: 1,
          periodStatus: PeriodStatus.Running,
        });

      const newState = live(currentState, endPeriod());

      expect(newState.clock).to.deep.include({
        timer: {
          isRunning: false,
          startTime: undefined,
          duration: Duration.create(10).toJSON()
        }
      });

      expect(newState).not.to.equal(currentState);
      expect(newState.clock?.timer).not.to.equal(currentState.clock?.timer);
    });

    it('should reset the period status', () => {
      mockTimeProvider(time2);
      currentState.clock = buildClock(
        /* timer= */undefined,
        {
          currentPeriod: 1,
          periodStatus: PeriodStatus.Running,
        });

      const newState = live(currentState, endPeriod());

      expect(newState.clock).to.deep.include({
        currentPeriod: 1,
        periodStatus: PeriodStatus.Pending
      });

      expect(newState).not.to.equal(currentState);
    });

    it('should reset the period status when timer is not running', () => {
      mockTimeProvider(time2);
      currentState.clock = buildClock(
        buildStoppedTimer(),
        {
          currentPeriod: 1,
          periodStatus: PeriodStatus.Running,
        });

      const newState = live(currentState, endPeriod());

      expect(newState.clock).to.deep.include({
        currentPeriod: 1,
        periodStatus: PeriodStatus.Pending,
      });

      expect(newState).not.to.equal(currentState);
    });

    it('should set the period status to done when on the last period', () => {
      mockTimeProvider(time2);
      currentState.clock = buildClock(
        /* timer= */undefined,
        {
          currentPeriod: 3,
          periodStatus: PeriodStatus.Running,
          totalPeriods: 3
        });

      const newState = live(currentState, endPeriod());

      expect(newState.clock).to.deep.include({
        currentPeriod: 3,
        periodStatus: PeriodStatus.Done
      });

      expect(newState).not.to.equal(currentState);
    });

    it('should do nothing if period is not started', () => {
      mockTimeProvider(startTime);
      currentState.clock = buildClock(
        /* timer= */undefined,
        {
          currentPeriod: 1,
          periodStatus: PeriodStatus.Pending,
        });

      const newState = live(currentState, endPeriod());

      expect(newState.clock).to.deep.include({
        currentPeriod: 1,
        periodStatus: PeriodStatus.Pending
      });

      expect(newState).to.equal(currentState);
    });

    it('should do nothing if periods are done', () => {
      mockTimeProvider(startTime);
      currentState.clock = buildClock(
        /* timer= */undefined,
        {
          currentPeriod: 3,
          periodStatus: PeriodStatus.Done,
          totalPeriods: 3
        });

      const newState = live(currentState, endPeriod());

      expect(newState.clock).to.deep.include({
        currentPeriod: 3,
        periodStatus: PeriodStatus.Done
      });

      expect(newState).to.equal(currentState);
    });

  }); // describe('clock/endPeriod')

  describe('clock/toggle', () => {
    let currentState: LiveState;

    beforeEach(() => {
      currentState = buildLiveStateWithCurrentGame(
        testlive.getLiveGameWithPlayers());
    });

    it('should start when no timer data exists', () => {
      expect(currentState.clock?.timer).to.be.undefined;
      mockTimeProvider(time3);

      const newState = live(currentState, toggle());

      expect(newState.clock).to.deep.include({
        timer: {
          isRunning: true,
          startTime: time3,
          duration: Duration.zero().toJSON()
        }
      });

      expect(newState).not.to.equal(currentState);
      expect(newState.clock?.timer).not.to.equal(currentState.clock?.timer);
    });

    it('should start when timer is set to not running', () => {
      mockTimeProvider(startTime);
      currentState.clock = buildClock(
        buildStoppedTimer());

      const newState = live(currentState, toggle());

      expect(newState.clock).to.deep.include({
        timer: {
          isRunning: true,
          startTime: startTime,
          duration: Duration.zero().toJSON()
        }
      });

      expect(newState).not.to.equal(currentState);
      expect(newState.clock?.timer).not.to.equal(currentState.clock?.timer);
    });

    it('should stop when timer is already running', () => {
      mockTimeProvider(time2);
      currentState.clock = buildClock(
        buildRunningTimer(time1));

      const newState = live(currentState, toggle());

      expect(newState.clock).to.deep.include({
        timer: {
          isRunning: false,
          startTime: undefined,
          duration: Duration.create(5).toJSON()
        }
      });

      expect(newState).not.to.equal(currentState);
      expect(newState.clock?.timer).not.to.equal(currentState.clock?.timer);
    });

    it('should stop when running and add to existing duration', () => {
      mockTimeProvider(time2);
      currentState.clock = buildClock(
        buildRunningTimer(startTime, 20));

      const newState = live(currentState, toggle());

      expect(newState.clock).to.deep.include({
        timer: {
          isRunning: false,
          startTime: undefined,
          duration: Duration.create(30).toJSON()
        }
      });

      expect(newState).not.to.equal(currentState);
      expect(newState.clock?.timer).not.to.equal(currentState.clock?.timer);
    });

    it('should not change the period when timer is set to not running', () => {
      mockTimeProvider(startTime);
      currentState.clock = buildClock(
        buildStoppedTimer(),
        {
          currentPeriod: 1,
          periodStatus: PeriodStatus.Running,
        });

      const newState = live(currentState, toggle());

      expect(newState.clock).to.deep.include({
        currentPeriod: 1,
        periodStatus: PeriodStatus.Running,
      });

      expect(newState).not.to.equal(currentState);
      // Check the timer to make sure the toggle happened, but the values don't
      // matter for this test.
      expect(newState.clock?.timer).not.to.equal(currentState.clock?.timer);
    });

    it('should not change the period when timer is already running', () => {
      mockTimeProvider(time2);
      currentState.clock = buildClock(
        buildRunningTimer(time1),
        {
          currentPeriod: 2,
          periodStatus: PeriodStatus.Running,
        });

      const newState = live(currentState, toggle());

      expect(newState.clock).to.deep.include({
        currentPeriod: 2,
        periodStatus: PeriodStatus.Running,
      });

      expect(newState).not.to.equal(currentState);
      // Check the timer to make sure the toggle happened, but the values don't
      // matter for this test.
      expect(newState.clock?.timer).not.to.equal(currentState.clock?.timer);
    });

  }); // describe('clock/toggle')
});
