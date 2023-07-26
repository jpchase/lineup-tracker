/** @format */

import { idGenerator } from '@app/util/id-generator.js';
import sinon from 'sinon';

export function mockIdGenerator(id0: string, id1?: string, id2?: string, id3?: string) {
  const stub = sinon.stub(idGenerator, 'newid').returns(id0);
  if (id1) {
    stub.onCall(1).returns(id1);
  }
  if (id2) {
    stub.onCall(2).returns(id2);
  }
  if (id3) {
    stub.onCall(3).returns(id3);
  }
  return stub;
}

export function mockIdGeneratorWithCallback(cb: (type?: string, size?: number) => string) {
  const stub = sinon.stub(idGenerator, 'newid').callsFake(cb);
  return stub;
}
