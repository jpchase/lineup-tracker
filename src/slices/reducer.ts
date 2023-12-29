/** @format */

import { combineSlices } from '@reduxjs/toolkit';
import { authSlice } from './auth/index.js';

export interface LazyLoadedSlices {}

export const rootReducer = combineSlices(authSlice).withLazyLoadedSlices<LazyLoadedSlices>();

export type RootState = ReturnType<typeof rootReducer>;
