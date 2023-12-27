/** @format */

import { createDynamicMiddleware } from '@reduxjs/toolkit';

const dynamicMiddlewareInstance = createDynamicMiddleware();

export const { addMiddleware, middleware } = dynamicMiddlewareInstance;
