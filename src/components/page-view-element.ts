import { LitElement, PropertyValues } from 'lit';
import { property } from 'lit/decorators.js';

// The type and interface is required to get the typing to work.
// See https://lit.dev/docs/composition/mixins/#mixins-in-typescript.

type Constructor<T = {}> = new (...args: any[]) => T;

export declare class PageViewInterface {
  // Is the element visible.
  active: boolean;
  // Is the element finished loading any data.
  ready: boolean;
  protected resetData(): void;
  protected resetDataProperties(): void;
  protected isDataReady(): boolean;
}

export const PageViewMixin = <T extends Constructor<LitElement>>(superClass: T) => {
  class PageViewClass extends superClass {

    @property({ type: Boolean })
    public active = false;

    @property({ type: Boolean, reflect: true })
    public ready = false;

    // Only render this page if it's actually visible.
    override shouldUpdate() {
      return this.active;
    }

    override willUpdate(changedProperties: PropertyValues<this>) {
      super.willUpdate(changedProperties);

      if (!this.ready && this.isDataReady()) {
        this.ready = true;
      }
    }

    // Reset the element, including marking it as not ready.
    protected resetData() {
      this.ready = false;
      this.resetDataProperties();
    }

    // Clear any data properties stored in the element.
    // To be overridden by the element.
    protected resetDataProperties() { }

    // Check if the element has all the data needed to render.
    // To be overridden by the element.
    protected isDataReady(): boolean {
      return false;
    }
  };

  return PageViewClass as unknown as Constructor<PageViewInterface> & T;
}

export class PageViewElement extends LitElement {
  // Only render this page if it's actually visible.
  override shouldUpdate() {
    return this.active;
  }

  @property({ type: Boolean })
  active = false;
}
