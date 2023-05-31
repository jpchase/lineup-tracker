/** @format */

import { Assertion } from '@esm-bundle/chai';
import { Dialog } from '@material/mwc-dialog';

function isElementShown(element: Element) {
  const style = getComputedStyle(element, null);
  return (
    style.display !== 'none' && style.visibility !== 'hidden' && style.visibility !== 'collapsed'
  );
}

declare global {
  export namespace Chai {
    interface Assertion {
      open: Assertion;
      shown: Assertion;
    }
  }
}

export function addElementAssertions() {
  Assertion.addProperty('open', function () {
    new Assertion(this._obj).to.be.instanceOf(Dialog);

    const open = (this._obj as Dialog).open;

    this.assert(
      open,
      `expected dialog to be open`,
      `expected dialog to not be open`,
      undefined // not used, required by type definition
    );
  });

  Assertion.addProperty('shown', function () {
    const element = this._obj as Element;
    const shown = isElementShown(element);

    this.assert(
      shown,
      `expected element to be shown`,
      `expected element to not be shown`,
      undefined // not used, required by type definition
    );
  });
}
