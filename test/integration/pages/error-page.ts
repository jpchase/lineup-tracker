/** @format */

import { PageObject, PageOptions } from './page-object.js';

export class ErrorPage extends PageObject {
  constructor(options: PageOptions = {}) {
    super({
      ...options,
    });
  }
}
