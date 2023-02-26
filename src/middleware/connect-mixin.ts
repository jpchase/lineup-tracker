import { AnyAction, ThunkAction, Unsubscribe } from '@reduxjs/toolkit';
import { RootState, RootStore, SliceStoreConfigurator } from '../store.js';

type Constructor<T> = new (...args: any[]) => T;

interface CustomElement {
  connectedCallback?(): void;
  disconnectedCallback?(): void;
}

export declare class StoreConnected {
  store?: RootStore;
  stateChanged(state: RootState): void;
  dispatch<R>(action: AnyAction | ThunkAction<R, RootState, any, any>): AnyAction | R;
  // TODO: Make protected
  protected registerController(controller: StateSubscribedController): void;
}

export interface StateSubscribedController {
  stateChanged(state: RootState): void;
}

export const ConnectStoreMixin = <T extends Constructor<CustomElement>>(superClass: T) => {

  class ConnectStoreClass extends superClass {
    private controllers = new Set<StateSubscribedController>();
    private _storeUnsubscribe!: Unsubscribe;
    store?: RootStore;
    storeConfigurator?: SliceStoreConfigurator;

    override connectedCallback() {
      if (super.connectedCallback) {
        super.connectedCallback();
      }

      // Configure the store, to allow for lazy loading.
      if (this.storeConfigurator) {
        if (this.store) {
          this.storeConfigurator(this.store);
        } else {
          this.store = this.storeConfigurator(this.store);
        }
      }
      const store = this.store;
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
      this.controllers.forEach(controller => {
        controller.stateChanged(state);
      });

      // Finally, notify the element.
      this.stateChanged(state);
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
    stateChanged(_state: RootState) { }
  };

  return ConnectStoreClass as unknown as Constructor<StoreConnected> & T;
}
