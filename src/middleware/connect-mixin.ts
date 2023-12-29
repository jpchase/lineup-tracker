/** @format */

import { AnyAction, ThunkAction, Unsubscribe } from '@reduxjs/toolkit';
import {
  AppStore,
  RootState,
  RootStore,
  SliceStoreConfigurator,
  store as globalStore,
} from '../store.js';
import { Constructor } from '../util/shared-types.js';
import { SliceConfigurator } from './slice-configurator.js';

interface CustomElement {
  connectedCallback?(): void;
  disconnectedCallback?(): void;
}

export declare class StoreConnected {
  store?: RootStore;
  stateChanged(state: RootState): void;
  dispatch<R>(action: AnyAction | ThunkAction<R, RootState, any, any>): AnyAction | R;
  protected registerController(controller: StateSubscribedController): void;
  protected registerSliceConfigurator(configurator: SliceConfigurator): void;
}

export interface StateSubscribedController {
  stateChanged(state: RootState): void;
}

export const ConnectStoreMixin = <T extends Constructor<CustomElement>>(superClass: T) => {
  class ConnectStoreClass extends superClass {
    private configurators = new Set<SliceConfigurator>();
    private controllers = new Set<StateSubscribedController>();
    private _storeUnsubscribe!: Unsubscribe;
    store?: RootStore;
    storeConfigurator?: SliceStoreConfigurator;

    override connectedCallback() {
      if (super.connectedCallback) {
        super.connectedCallback();
      }

      // Use the global store, if the store instance was not previously set.
      if (!this.store) {
        this.store = globalStore;
      }
      // TODO: remove cast when this.store is no longer `RootStore`
      const store = this.store as AppStore;
      // Configure lazy-loaded slices.
      this.configurators.forEach((configurator) => {
        // TODO: pass options, namely to disable hydration
        configurator(store);
      });
      // Configure the store, to allow for lazy loading.
      if (this.storeConfigurator) {
        this.storeConfigurator(this.store);
      }
      if (store) {
        // Connect the element to the store.
        this._storeUnsubscribe = store.subscribe(() => {
          this.notifyStateChanged(store.getState());
        });
        this.notifyStateChanged(store.getState());
      }
    }

    override disconnectedCallback() {
      if (this._storeUnsubscribe) {
        this._storeUnsubscribe();
      }

      if (super.disconnectedCallback) {
        super.disconnectedCallback();
      }
    }

    private notifyStateChanged(state: RootState) {
      // First, notify any controllers.
      this.controllers.forEach((controller) => {
        controller.stateChanged(state);
      });

      // Finally, notify the element.
      this.stateChanged(state);
    }

    protected registerSliceConfigurator(configurator: SliceConfigurator) {
      if (!configurator) {
        return;
      }
      this.configurators.add(configurator);
    }

    protected registerController(controller: StateSubscribedController) {
      if (!controller) {
        return;
      }
      this.controllers.add(controller);
    }

    dispatch<R>(action: AnyAction | ThunkAction<R, RootState, any, AnyAction>): AnyAction | R {
      // The type cast is required to avoid compile errors trying to match dispatch() overloads.
      if ('type' in action) {
        return this.store!.dispatch(action as AnyAction);
      }
      return this.store!.dispatch(action);
    }

    /**
     * The `stateChanged(state)` method will be called when the state is updated.
     */
    stateChanged(_state: RootState) {}
  }

  return ConnectStoreClass as unknown as Constructor<StoreConnected> & T;
};
