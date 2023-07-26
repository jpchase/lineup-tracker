/** @format */

import { nanoid } from '@reduxjs/toolkit';

// Trivial wrapper, to allow for mocking in tests.
export const idGenerator = {
  newid(type?: string, size?: number) {
    const prefix = type ?? '';
    return prefix + nanoid(size);
  },
};
