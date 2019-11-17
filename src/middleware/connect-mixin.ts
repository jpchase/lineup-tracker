/**
@license
*/

import { Unsubscribe } from 'redux';
import { RootState, RootAction, RootStore, SliceStoreConfigurator } from '../store';
import { ThunkAction } from 'redux-thunk';

type Constructor<T> = new(...args: any[]) => T;

interface CustomElement {
  connectedCallback?(): void;
  disconnectedCallback?(): void;
}

export interface ElementMixinInterface {
  store?: RootStore;
  stateChanged(state: RootState): void;
  dispatch<R>(action: RootAction|ThunkAction<R, RootState, any, any>): RootAction | R;
}

export const connectStore =
  () =>
  <T extends Constructor<CustomElement>>(baseElement: T): T &
  Constructor<ElementMixinInterface> =>
  class extends baseElement {
    private _storeUnsubscribe!: Unsubscribe;
    store?: RootStore;
    storeConfigurator?: SliceStoreConfigurator;

    connectedCallback() {
      console.log(`connectStore.connectedCallback: store is set ${this.store ? true : false}`);
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
          this.stateChanged(store.getState());
        });
        this.stateChanged(store.getState());
      }
    }

    disconnectedCallback() {
      if (this._storeUnsubscribe) {
        this._storeUnsubscribe();
      }

      if (super.disconnectedCallback) {
        super.disconnectedCallback();
      }
    }

    dispatch<R>(action: RootAction|ThunkAction<R, RootState, any, RootAction>): RootAction | R {
      // The type cast is required to avoid compile errors trying to match dispatch() overloads.
      if ('type' in action) {
        return this.store!.dispatch(action as RootAction);
      }
      return this.store!.dispatch(action);
    }

    /**
     * The `stateChanged(state)` method will be called when the state is updated.
     */
    stateChanged(_state: RootState) {}
  };
