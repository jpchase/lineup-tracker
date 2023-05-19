/** @format */

import { expect } from '@open-wc/testing';
import { Formation, FormationBuilder, FormationType } from '@app/models/formation';

describe('FormationBuilder', () => {
  it('create should throw for unknown formation type', () => {
    expect(() => {
      FormationBuilder.create(<FormationType>'no such formation');
    }).to.throw();
  });

  it('create should handle 4-3-3', () => {
    const expectedFormation: Formation = {
      type: FormationType.F4_3_3,
      forward1: {
        id: 'FWD1',
        positions: [{ id: 'S', type: 'S' }],
      },
      forward2: {
        id: 'FWD2',
        positions: [
          { id: 'LW', type: 'W' },
          { id: 'RW', type: 'W' },
        ],
      },
      midfield1: {
        id: 'MID1',
        positions: [
          { id: 'AM1', type: 'AM' },
          { id: 'AM2', type: 'AM' },
        ],
      },
      midfield2: {
        id: 'MID2',
        positions: [{ id: 'HM', type: 'HM' }],
      },
      defense: {
        id: 'DEF',
        positions: [
          { id: 'LFB', type: 'FB' },
          { id: 'LCB', type: 'CB' },
          { id: 'RCB', type: 'CB' },
          { id: 'RFB', type: 'FB' },
        ],
      },
      gk: {
        id: 'GK',
        positions: [{ id: 'GK', type: 'GK' }],
      },
    };

    const new433 = FormationBuilder.create(FormationType.F4_3_3);

    expect(new433).to.deep.equal(expectedFormation);
  });

  it('create should handle 4-2-3-1', () => {
    const expectedFormation: Formation = {
      type: FormationType.F4_2_3_1,
      forward1: {
        id: 'FWD1',
        positions: [{ id: 'S', type: 'S' }],
      },
      forward2: {
        id: 'FWD2',
        positions: [],
      },
      midfield1: {
        id: 'MID1',
        positions: [
          { id: 'LW', type: 'W' },
          { id: 'AM', type: 'AM' },
          { id: 'RW', type: 'W' },
        ],
      },
      midfield2: {
        id: 'MID2',
        positions: [
          { id: 'HM1', type: 'HM' },
          { id: 'HM2', type: 'HM' },
        ],
      },
      defense: {
        id: 'DEF',
        positions: [
          { id: 'LFB', type: 'FB' },
          { id: 'LCB', type: 'CB' },
          { id: 'RCB', type: 'CB' },
          { id: 'RFB', type: 'FB' },
        ],
      },
      gk: {
        id: 'GK',
        positions: [{ id: 'GK', type: 'GK' }],
      },
    };

    const new4231 = FormationBuilder.create(FormationType.F4_2_3_1);

    expect(new4231).to.deep.equal(expectedFormation);
  });

  it('create should handle 3-1-4-2', () => {
    const expectedFormation: Formation = {
      type: FormationType.F3_1_4_2,
      forward1: {
        id: 'FWD1',
        positions: [
          { id: 'S1', type: 'S' },
          { id: 'S2', type: 'S' },
        ],
      },
      forward2: {
        id: 'FWD2',
        positions: [],
      },
      midfield1: {
        id: 'MID1',
        positions: [
          { id: 'LW', type: 'W' },
          { id: 'AM1', type: 'AM' },
          { id: 'AM2', type: 'AM' },
          { id: 'RW', type: 'W' },
        ],
      },
      midfield2: {
        id: 'MID2',
        positions: [{ id: 'HM', type: 'HM' }],
      },
      defense: {
        id: 'DEF',
        positions: [
          { id: 'LFB', type: 'FB' },
          { id: 'CB', type: 'CB' },
          { id: 'RFB', type: 'FB' },
        ],
      },
      gk: {
        id: 'GK',
        positions: [{ id: 'GK', type: 'GK' }],
      },
    };

    const new3142 = FormationBuilder.create(FormationType.F3_1_4_2);

    expect(new3142).to.deep.equal(expectedFormation);
  });
});
