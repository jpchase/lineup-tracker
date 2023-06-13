/** @format */

import { getEnv } from '@app/app/environment.js';
import { expect } from '@open-wc/testing';

describe('Environment config', () => {
  it('getEnv returns the current config', () => {
    const env = getEnv();
    // Check the expected structure. Keys only, the values don't matter and are
    // ignored by the keys() assertion.
    expect(env, 'Main properties').to.have.keys({
      environment: 'this is ignored',
      firebase: {
        'nested keys are': 'ignored',
      },
    });
    expect(env.firebase, 'Firebase config').to.have.keys({
      options: {
        'more nested keys that are': 'ignored',
      },
      enablePersistence: true,
    });
  });
});
