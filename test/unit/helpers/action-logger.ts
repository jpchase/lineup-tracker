/** @format */

import { addMiddleware } from '@app/middleware/dynamic-middlewares.js';
import { Middleware, UnknownAction } from '@reduxjs/toolkit';

type LoggerMiddleware = Middleware<any, any, any>;

export class ActionLogger {
  private middleware: LoggerMiddleware;
  private actions: UnknownAction[] = [];

  constructor() {
    this.middleware = (/* api */) => (next: any) => (action: unknown) => {
      this.actions.push(action as UnknownAction);
      return next(action);
    };
  }

  setup() {
    addMiddleware(this.middleware);
  }

  lastAction(): UnknownAction | undefined {
    if (this.actions.length) {
      return this.actions[this.actions.length - 1];
    }
    return undefined;
  }
}
