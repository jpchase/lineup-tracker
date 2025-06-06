/** @format */

import { ReactiveController, ReactiveControllerHost } from 'lit';
import { RootState } from '../../app/store.js';
import { selectCurrentUserId } from '../../slices/auth/index.js';
import { AuthorizedView } from './page-view-element.js';
import { StateSubscribedController } from './connect-mixin.js';

type AuthorizedViewHost = ReactiveControllerHost & AuthorizedView;

export class AuthController implements ReactiveController, StateSubscribedController {
  private host: AuthorizedViewHost;

  constructor(host: AuthorizedViewHost) {
    (this.host = host).addController(this);
  }

  hostConnected() {}

  hostDisconnected() {}

  stateChanged(state: RootState) {
    this.host.authorized = this.checkAuthorized(state);
  }

  protected checkAuthorized(_state: RootState): boolean {
    return true;
  }
}

export class SignedInAuthController extends AuthController {
  protected override checkAuthorized(state: RootState): boolean {
    return !!selectCurrentUserId(state);
  }
}
