import {CurrentTimeProvider,ManualTimeProvider,Timer} from '../app/scripts/clock.js';

describe('CurrentTimeProvider', () => {
  let provider;

  beforeEach(() => {
    provider = new CurrentTimeProvider();
  });

  it('should not be frozen by default', () => {
    expect(provider.isFrozen).toBe(false);
  });

  it('should return the current time', () => {
    const expectedTime = Date.now();
    const actualTime = provider.getCurrentTime();
    expect(actualTime).toEqual(expectedTime);
  });

  it('should throw for repeated calls to freeze()', () => {
    expect(provider.isFrozen).toBe(false);
    provider.freeze();
    expect(provider.isFrozen).toBe(true);
    expect(() => {
      provider.freeze();
    }).toThrowError('Cannot freeze when already frozen');
  });

  it('should throw for repeated calls to unfreeze()', () => {
    expect(provider.isFrozen).toBe(false);
    provider.freeze();
    expect(provider.isFrozen).toBe(true);
    provider.unfreeze();
    expect(provider.isFrozen).toBe(false);
    expect(() => {
      provider.unfreeze();
    }).toThrowError('Cannot unfreeze when not frozen');
  });

  it('should return the frozen time', () => {
    const time1 = new Date(2016, 0, 1, 14, 0, 0);
    const time2 = new Date(2016, 0, 1, 14, 1, 0);

    spyOn(provider, 'getTimeInternal').and.returnValues(time1, time2);

    provider.freeze();

    const actualTime1 = provider.getCurrentTime();
    expect(actualTime1).toEqual(time1);
    const actualTime2 = provider.getCurrentTime();
    expect(actualTime2).toEqual(time1);

    provider.unfreeze();

    const actualTime3 = provider.getCurrentTime();
    expect(actualTime3).toEqual(time2);
  });
});

describe('ManualTimeProvider', () => {
  let provider;

  beforeEach(() => {
    provider = new ManualTimeProvider();
  });

  it('should return the current time when not manually set', () => {
    const expectedTime = Date.now();
    const actualTime = provider.getCurrentTime();
    expect(actualTime).toEqual(expectedTime);
  });

  it('should return the set time', () => {
    const time1 = new Date(2016, 0, 1, 14, 0, 0);
    const time2 = new Date(2016, 0, 1, 14, 1, 0);

    provider.setCurrentTime(time1);

    const actualTime1 = provider.getCurrentTime();
    expect(actualTime1).toEqual(time1);
    const actualTime2 = provider.getCurrentTime();
    expect(actualTime2).toEqual(time1);

    provider.setCurrentTime(time2);

    const actualTime3 = provider.getCurrentTime();
    expect(actualTime3).toEqual(time2);

    provider.setCurrentTime(time1);

    const actualTime4 = provider.getCurrentTime();
    expect(actualTime4).toEqual(time1);
  });

});

describe('Timer', () => {
  const startTime = new Date(2016, 0, 1, 14, 0, 0);
  const time1 = new Date(2016, 0, 1, 14, 0, 5);
  const time2 = new Date(2016, 0, 1, 14, 0, 10);
  const time3 = new Date(2016, 0, 1, 14, 1, 55);

  function mockTimeProvider(t0, t1, t2, t3) {
    let provider = new CurrentTimeProvider();
    spyOn(provider, 'getTimeInternal').and.returnValues(t0, t1, t2, t3);
    return provider;
  }

  function isElapsedEqual(actual, expected) {
    if (!actual || !expected)
      return false;

    if (!actual.length || !expected.length ||
        expected.length !== 2 ||
        actual.length < expected.length)
      return false;

    for (var i = 0; i < expected.length; i++) {
      if (expected[i] != actual[i])
        return false;
    }
    return true;
  }

  beforeEach(() => {
    jasmine.addMatchers({
      toBeInitialized: function () {
        return {
          compare: function (actual, expected) {
            let timer = actual;

            return {
              pass: timer && !timer.isRunning && !timer.startTime &&
                    timer.duration && timer.duration[0] === 0 && timer.duration[1] === 0
            };
          }
        };
      },
      toHaveElapsed: function () {
        return {
          compare: function (actual, expected) {
            let timer = actual;
            let elapsed = timer ? timer.getElapsed() : null;

            return {
              pass: elapsed && isElapsedEqual(elapsed, expected)
            };
          }
        };
      },
    });

  });

  it('should not be running for new instance', () => {
    let timer = new Timer();
    expect(timer.isRunning).toBe(false);
  });

  it('should be running after start', () => {
    let timer = new Timer();
    timer.start();
    expect(timer.isRunning).toBe(true);
  });

  it('should not be running after stop', () => {
    let timer = new Timer();
    timer.start();
    timer.stop();
    expect(timer.isRunning).toBe(false);
  });

  it('should be empty after reset', () => {
    const provider = mockTimeProvider(startTime, time1);
    let timer = new Timer(null, provider);
    timer.start();
    timer.stop();
    timer.reset();
    expect(timer).toBeInitialized();
  });

  describe('Elapsed time', () => {

    it('should have 0 elapsed for new instance', () => {
      let timer = new Timer();
      expect(timer).toBeInitialized();
    });

    it('should have correct elapsed when running', () => {
      const provider = mockTimeProvider(startTime, time1, time1);
      let timer = new Timer(null, provider);
      timer.start();
      expect(timer).toHaveElapsed([0, 5]);
      timer.start();
      expect(timer).toHaveElapsed([0, 5]);
    });

    it('should have correct elapsed after stopped', () => {
      const provider = mockTimeProvider(startTime, time2);
      let timer = new Timer(null, provider);
      timer.start();
      timer.stop();
      expect(timer).toHaveElapsed([0, 10]);
      timer.stop();
      expect(timer).toHaveElapsed([0, 10]);
    });

    it('should have correct elapsed after restarting', () => {
      const provider = mockTimeProvider(startTime, time1, startTime, time2);
      let timer = new Timer(null, provider);
      timer.start();
      timer.stop();
      timer.start();
      expect(timer).toHaveElapsed([0, 15]);
    });

    it('should have correct elapsed after restarted and stopped', () => {
      const provider = mockTimeProvider(startTime, time2, startTime, time2);
      let timer = new Timer(null, provider);
      timer.start();
      timer.stop();
      timer.start();
      timer.stop();
      expect(timer).toHaveElapsed([0, 20]);
    });

    it('should have correct elapsed when added seconds equal exactly 1 minute', () => {
      const provider = mockTimeProvider(startTime, time3, startTime, time1);
      let timer = new Timer(null, provider);
      timer.start();
      timer.stop();
      timer.start();
      timer.stop();
      expect(timer).toHaveElapsed([2, 0]);
    });

    it('should have correct elapsed when added seconds total more than 1 minute', () => {
      const provider = mockTimeProvider(startTime, time3, startTime, time2);
      let timer = new Timer(null, provider);
      timer.start();
      timer.stop();
      timer.start();
      timer.stop();
      expect(timer).toHaveElapsed([2, 5]);
    });

  }); // describe('Elapsed time')

  describe('Existing data', () => {

    it('should not have the time provider serialized', () => {
      let timer = new Timer(null);
      const serialized = JSON.stringify(timer);
      let timerData = JSON.parse(serialized);
      expect(timerData.isRunning).toBe(false);
      expect(timerData.startTime).toBe(null);
      expect(timerData.duration).toEqual([0, 0]);
      expect(timerData.provider).toBe(undefined);
    });

    it('should be initialized correctly for null data', () => {
      let timer = new Timer(null);
      expect(timer).toBeInitialized();
    });

    it('should be initialized correctly for empty data', () => {
      let timer = new Timer({});
      expect(timer).toBeInitialized();
    });

    it('should be initialized correctly from stopped data', () => {
      let expected = {
        isRunning: false,
        startTime: null,
        duration: [3, 4],
      }
      let timer = new Timer(expected);
      expect(timer.startTime).toBe(expected.startTime);
      expect(timer.isRunning).toBe(expected.isRunning);
      expect(timer).toHaveElapsed(expected.duration);
    });

    it('should be initialized correctly from running data', () => {
      let expected = {
        isRunning: true,
        startTime: startTime,
        duration: [3, 4],
      }
      const provider = mockTimeProvider(time3);

      let timer = new Timer(expected, provider);
      expect(timer.startTime).toBe(expected.startTime);
      expect(timer.isRunning).toBe(expected.isRunning);
      expect(timer).toHaveElapsed([4, 59]);
    });

  }); // describe('Existing data')

});
