/** @format */

import { addMiddleware } from '@app/middleware/dynamic-middlewares.js';
import { Middleware, UnknownAction } from '@reduxjs/toolkit';
import { debug } from '@app/common/debug.js';

const debugActions = debug('ActionLogger');

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

  actionCount(): number {
    return this.actions.length;
  }

  lastAction(skipActionType?: string): UnknownAction | undefined {
    if (!this.actions.length) {
      return undefined;
    }
    if (!skipActionType) {
      return this.actions[this.actions.length - 1];
    }

    let action: UnknownAction;
    for (let index = this.actions.length - 1; index >= 0; index--) {
      action = this.actions[index];
      if (action.type === skipActionType) {
        continue;
      }
      break;
    }
    return action!;
  }

  logActions() {
    debugActions(JSON.stringify(this.actions));
  }
}
