/** @format */

import { CurrentTimeProvider, Duration, ManualTimeProvider, TimerData } from '@app/models/clock';
import { Assertion } from '@esm-bundle/chai';
import sinon from 'sinon';

export function buildRunningTimer(startTime?: number, elapsedSeconds?: number): TimerData {
  return {
    isRunning: true,
    startTime: startTime || new Date(2016, 0, 1, 14, 0, 0).getTime(),
    duration: (elapsedSeconds ? Duration.create(elapsedSeconds) : Duration.zero()).toJSON(),
  };
}

export function buildStoppedTimer(elapsedSeconds?: number): TimerData {
  return {
    isRunning: false,
    startTime: undefined,
    duration: (elapsedSeconds ? Duration.create(elapsedSeconds) : Duration.zero()).toJSON(),
  };
}

export function mockCurrentTime(t0: number) {
  return sinon.useFakeTimers({ now: t0 });
}

export function mockTimeProvider(t0: number, t1?: number, t2?: number, t3?: number) {
  const provider = new CurrentTimeProvider();
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

export function mockTimeProviderWithCallback(cb: () => number) {
  const provider = new CurrentTimeProvider();
  sinon.stub(provider, 'getTimeInternal').callsFake(cb);
  return provider;
}

export function manualTimeProvider(currentTime: number) {
  const provider = new ManualTimeProvider();
  if (currentTime) {
    provider.setCurrentTime(currentTime);
  }
  return provider;
}

export function buildDuration(minutes: number, seconds: number): Duration {
  const total = minutes * 60 + seconds;
  return Duration.create(total);
}

export function isElapsedEqual(actual: Duration, expected: number[]) {
  if (!actual || !expected) {
    return false;
  }

  if (!expected.length || expected.length !== 2) {
    return false;
  }

  const expectedDuration = buildDuration(expected[0], expected[1]);

  return expectedDuration._elapsed === actual._elapsed;
}

export function addDurationAssertion<ActualType>(
  name: string,
  actualDesc: string,
  getDuration: (actual: ActualType) => Duration | null
) {
  Assertion.addMethod(name, function (this, expected: number[]) {
    const elapsed = getDuration(this._obj as ActualType);
    let actual = null;
    if (elapsed) {
      actual = [elapsed.getMinutes(), elapsed.getSeconds()];
    }
    this.assert(
      elapsed && isElapsedEqual(elapsed, expected),
      `expected ${actualDesc} #{act} to be #{exp}`,
      `expected ${actualDesc} #{act} to not be #{exp}`,
      expected,
      actual,
      /*showDiff=*/ false
    );
  });
}
