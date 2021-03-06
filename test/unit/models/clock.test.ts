import { CurrentTimeProvider, Duration, ManualTimeProvider, Timer } from '@app/models/clock';
import { expect } from '@open-wc/testing';
import * as sinon from 'sinon';

declare global {
  export namespace Chai {
    interface Assertion {
      elapsed(expected: number[]): Assertion;
      initialized(): Assertion;
      time(expected: number): Assertion;
    }
  }
}

function isTimeEqual(actual: number, expected: number) {
  return actual === expected || actual === expected + 1;
}

chai.use(function (chai /*, utils*/) {
  chai.Assertion.addMethod("time", function (this: any, expected: number) {
    const actual = this._obj;
    this.assert(
      actual && isTimeEqual(actual, expected),
      'expected #{this} to be #{exp}',
      'expected #{this} to not be #{exp}',
      expected
    );
  });
});

function buildDuration(minutes: number, seconds: number): Duration {
  const total = (minutes * 60) + seconds;
  return Duration.create(total);
}

describe('CurrentTimeProvider', () => {
  let provider: CurrentTimeProvider;

  beforeEach(() => {
    provider = new CurrentTimeProvider();
  });

  it('should not be frozen by default', () => {
    expect(provider.isFrozen).to.be.false;
  });

  it('should return the current time', () => {
    const expectedTime = Date.now();
    const actualTime = provider.getCurrentTime();
    expect(actualTime).to.be.time(expectedTime);
  });

  it('should throw for repeated calls to freeze()', () => {
    expect(provider.isFrozen).to.be.false;
    provider.freeze();
    expect(provider.isFrozen).to.be.true;
    expect(() => {
      provider.freeze();
    }).to.throw('Cannot freeze when already frozen');
  });

  it('should throw for repeated calls to unfreeze()', () => {
    expect(provider.isFrozen).to.be.false;
    provider.freeze();
    expect(provider.isFrozen).to.be.true;
    provider.unfreeze();
    expect(provider.isFrozen).to.be.false;
    expect(() => {
      provider.unfreeze();
    }).to.throw('Cannot unfreeze when not frozen');
  });

  it('should return the frozen time', () => {
    const time1 = new Date(2016, 0, 1, 14, 0, 0).getTime();
    const time2 = new Date(2016, 0, 1, 14, 1, 0).getTime();

    sinon.stub(provider, 'getTimeInternal').onFirstCall().returns(time1).onSecondCall().returns(time2);

    provider.freeze();

    const actualTime1 = provider.getCurrentTime();
    expect(actualTime1).to.equal(time1);
    const actualTime2 = provider.getCurrentTime();
    expect(actualTime2).to.equal(time1);

    provider.unfreeze();

    const actualTime3 = provider.getCurrentTime();
    expect(actualTime3).to.equal(time2);
  });
});

describe('ManualTimeProvider', () => {
  let provider: ManualTimeProvider;

  beforeEach(() => {
    provider = new ManualTimeProvider();
  });

  it('should return the current time when not manually set', () => {
    const expectedTime = Date.now();
    const actualTime = provider.getCurrentTime();
    expect(actualTime).to.be.time(expectedTime);
  });

  it('should return the set time', () => {
    const time1 = new Date(2016, 0, 1, 14, 0, 0).getTime();
    const time2 = new Date(2016, 0, 1, 14, 1, 0).getTime();

    provider.setCurrentTime(time1);

    const actualTime1 = provider.getCurrentTime();
    expect(actualTime1).to.equal(time1);
    const actualTime2 = provider.getCurrentTime();
    expect(actualTime2).to.equal(time1);

    provider.setCurrentTime(time2);

    const actualTime3 = provider.getCurrentTime();
    expect(actualTime3).to.equal(time2);

    provider.setCurrentTime(time1);

    const actualTime4 = provider.getCurrentTime();
    expect(actualTime4).to.equal(time1);
  });

  it('should return the incremented time', () => {
    const time1 = new Date(2016, 0, 1, 14, 0, 0).getTime();
    const time2 = new Date(2016, 0, 1, 14, 1, 0).getTime();
    const time3 = new Date(2016, 0, 1, 14, 2, 15).getTime();

    provider.setCurrentTime(time1);

    const actualTime1 = provider.getCurrentTime();
    expect(actualTime1).to.equal(time1);

    provider.incrementCurrentTime(buildDuration(1, 0));

    const actualTime2 = provider.getCurrentTime();
    expect(actualTime2).to.equal(time2);

    provider.incrementCurrentTime(buildDuration(1, 15));

    const actualTime3 = provider.getCurrentTime();
    expect(actualTime3).to.equal(time3);
  });

});

describe('Duration', () => {

  it('should return initialized for zero', () => {
    expect(Duration.zero()).to.deep.equal({ "_elapsed": 0 });
  });

  describe('add', () => {
    const testValues = [
      { left: [0, 1], right: [0, 1], sum: [0, 2] },
      { left: [1, 0], right: [1, 0], sum: [2, 0] },
      { left: [1, 2], right: [3, 4], sum: [4, 6] },
      { left: [1, 59], right: [0, 1], sum: [2, 0] },
      { left: [12, 29], right: [10, 32], sum: [23, 1] },
    ];

    function formatDuration(duration: Duration) {
      return '[' + duration.getMinutes() + ',' + duration.getSeconds() + ']';
    }

    it('should return zero for both inputs zero', () => {
      expect(Duration.add(Duration.zero(), Duration.zero())).to.deep.equal(Duration.zero());

      expect(Duration.add(Duration.zero(), buildDuration(0, 0))).to.deep.equal(Duration.zero());

      expect(Duration.add(buildDuration(0, 0), Duration.zero())).to.deep.equal(Duration.zero());
    });

    function addTest(left: Duration, right: Duration, expectedSum: Duration) {
      it('should return correct sum for zero + ' + formatDuration(left), () => {
        const actualSum = Duration.add(Duration.zero(), left);
        expect(actualSum).to.deep.equal(left);
      });

      it('should return correct sum for ' + formatDuration(left) + ' + zero', () => {
        const actualSum = Duration.add(left, Duration.zero());
        expect(actualSum).to.deep.equal(left);
      });

      it('should return correct sum for ' + formatDuration(left) + ' + ' + formatDuration(right), () => {
        const actualSum = Duration.add(left, right);
        expect(actualSum).to.deep.equal(expectedSum);
      });
    }

    testValues.forEach(test => {
      const left = buildDuration(test.left[0], test.left[1]);
      const right = buildDuration(test.right[0], test.right[1]);
      const sum = buildDuration(test.sum[0], test.sum[1]);
      addTest(left, right, sum);
    });
  }); // add
});

describe('Timer', () => {
  const startTime = new Date(2016, 0, 1, 14, 0, 0).getTime();
  const time1 = new Date(2016, 0, 1, 14, 0, 5).getTime();
  const time2 = new Date(2016, 0, 1, 14, 0, 10).getTime();
  const time3 = new Date(2016, 0, 1, 14, 1, 55).getTime();

  function mockTimeProvider(t0: number, t1?: number, t2?: number, t3?: number) {
    let provider = new CurrentTimeProvider();
    const stub = sinon.stub(provider, 'getTimeInternal').returns(t0);
    if (t1) {
      stub.onCall(1).returns(t1);
    }
    if (t2) {
      stub.onCall(2).returns(t2);
    }
    if (t3) {
      stub.onCall(3).returns(t3);
    }
    return provider;
  }

  function manualTimeProvider(currentTime: number) {
    let provider = new ManualTimeProvider();
    if (currentTime) {
      provider.setCurrentTime(currentTime);
    }
    return provider;
  }

  function isElapsedEqual(actual: Duration, expected: number[]) {
    if (!actual || !expected)
      return false;

    if (!expected.length || expected.length !== 2)
      return false;

    const expectedDuration = buildDuration(expected[0], expected[1]);

    return expectedDuration._elapsed === actual._elapsed;
  }

  chai.use(function (chai /*, utils*/) {
    chai.Assertion.addMethod("initialized", function (this: any) {
      const timer = this._obj;
      const pass = timer && !timer.isRunning && !timer.startTime &&
        timer.duration && timer.duration._elapsed === 0;
      this.assert(
        pass,
        'expected #{this} to be stopped, without start time, and duration [0,0]',
        'expected #{this} to not be stopped, with a start time, or not duration [0,0]'
      );
    });

    chai.Assertion.addMethod("elapsed", function (this: any, expected: number[]) {
      const timer = this._obj as Timer;
      const elapsed = timer ? timer.getElapsed() : null;
      this.assert(
        elapsed && isElapsedEqual(elapsed, expected),
        `expected ${JSON.stringify(timer)} elapsed #{act} to be #{exp}`,
        `expected ${JSON.stringify(timer)} elapsed #{act} to not be #{exp}`,
        expected,
        elapsed
      );
    });
  });

  it('should not be running for new instance', () => {
    let timer = new Timer();
    expect(timer.isRunning).to.be.false;
  });

  it('should be running after start', () => {
    let timer = new Timer();
    timer.start();
    expect(timer.isRunning).to.be.true;
  });

  it('should not be running after stop', () => {
    let timer = new Timer();
    timer.start();
    timer.stop();
    expect(timer.isRunning).to.be.false;
  });

  it('should be empty after reset', () => {
    const provider = mockTimeProvider(startTime, time1);
    let timer = new Timer(undefined, provider);
    timer.start();
    timer.stop();
    timer.reset();
    expect(timer).to.be.initialized();
  });

  describe('Elapsed time', () => {

    it('should have 0 elapsed for new instance', () => {
      let timer = new Timer();
      expect(timer).to.be.initialized();
    });

    it('should have correct elapsed when running', () => {
      const provider = mockTimeProvider(startTime, time1, time1);
      let timer = new Timer(undefined, provider);
      timer.start();
      expect(timer).to.have.elapsed([0, 5]);
      timer.start();
      expect(timer).to.have.elapsed([0, 5]);
    });

    it('should have correct elapsed when running for more than an hour', () => {
      const provider = manualTimeProvider(startTime);
      let timer = new Timer(undefined, provider);
      timer.start();

      provider.incrementCurrentTime(buildDuration(0, 5));
      expect(timer).to.have.elapsed([0, 5]);

      provider.incrementCurrentTime(buildDuration(59, 59));
      expect(timer).to.have.elapsed([60, 4]);

      provider.incrementCurrentTime(buildDuration(31, 0));
      expect(timer).to.have.elapsed([91, 4]);
    });

    it('should have correct elapsed after stopped', () => {
      const provider = mockTimeProvider(startTime, time2);
      let timer = new Timer(undefined, provider);
      timer.start();
      timer.stop();
      expect(timer).to.have.elapsed([0, 10]);
      timer.stop();
      expect(timer).to.have.elapsed([0, 10]);
    });

    it('should have correct elapsed after restarting', () => {
      const provider = mockTimeProvider(startTime, time1, startTime, time2);
      let timer = new Timer(undefined, provider);
      timer.start();
      timer.stop();
      timer.start();
      expect(timer).to.have.elapsed([0, 15]);
    });

    it('should have correct elapsed after restarted and stopped', () => {
      const provider = mockTimeProvider(startTime, time2, startTime, time2);
      let timer = new Timer(undefined, provider);
      timer.start();
      timer.stop();
      timer.start();
      timer.stop();
      expect(timer).to.have.elapsed([0, 20]);
    });

    it('should have correct elapsed when added seconds equal exactly 1 minute', () => {
      const provider = mockTimeProvider(startTime, time3, startTime, time1);
      let timer = new Timer(undefined, provider);
      timer.start();
      timer.stop();
      timer.start();
      timer.stop();
      expect(timer).to.have.elapsed([2, 0]);
    });

    it('should have correct elapsed when added seconds total more than 1 minute', () => {
      const provider = mockTimeProvider(startTime, time3, startTime, time2);
      let timer = new Timer(undefined, provider);
      timer.start();
      timer.stop();
      timer.start();
      timer.stop();
      expect(timer).to.have.elapsed([2, 5]);
    });

  }); // describe('Elapsed time')

  describe('Existing data', () => {

    it('should not have the time provider serialized', () => {
      let timer = new Timer(undefined);
      const serialized = JSON.stringify(timer);
      let timerData = JSON.parse(serialized);
      expect(timerData.isRunning).to.be.false;
      expect(timerData.startTime).to.be.undefined;
      expect(timerData.duration).to.deep.equal({ value: 0 });
      expect(timerData.provider).to.be.undefined;
    });

    it('should be initialized correctly for null data', () => {
      let timer = new Timer(undefined);
      expect(timer).to.be.initialized();
    });

    it('should be initialized correctly for empty data', () => {
      let timer = new Timer({});
      expect(timer).to.be.initialized();
    });

    it('should be initialized correctly from stopped data', () => {
      let expected = {
        isRunning: false,
        startTime: undefined,
        duration: buildDuration(3, 4).toJSON(),
      }
      let timer = new Timer(expected);
      expect(timer.startTime).to.equal(expected.startTime);
      expect(timer.isRunning).to.equal(expected.isRunning);
      expect(timer).to.have.elapsed([3, 4]);
    });

    it('should be initialized correctly from running data', () => {
      let expected = {
        isRunning: true,
        startTime: startTime,
        duration: buildDuration(3, 4).toJSON(),
      }
      const provider = mockTimeProvider(time3);

      let timer = new Timer(expected, provider);
      expect(timer.startTime).to.equal(expected.startTime);
      expect(timer.isRunning).to.equal(expected.isRunning);
      expect(timer).to.have.elapsed([4, 59]);
    });

  }); // describe('Existing data')

});
