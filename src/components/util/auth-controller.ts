/** @format */

import { ReactiveController, ReactiveControllerHost } from 'lit';
import { StateSubscribedController } from '../../middleware/connect-mixin.js';
import { selectCurrentUserId } from '../../slices/auth/auth-slice.js';
import { RootState } from '../../store.js';
import { AuthorizedView } from '../page-view-element.js';

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
  constructor(host: AuthorizedViewHost) {
    super(host);
  }

  protected override checkAuthorized(state: RootState): boolean {
    return !!selectCurrentUserId(state);
  }
}
