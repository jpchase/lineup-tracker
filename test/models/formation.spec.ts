import { Formation, FormationBuilder, FormationType} from '@app/models/formation';

describe('FormationBuilder', () => {

  it('create should throw for unknown formation type', () => {
    expect(() => {
      FormationBuilder.create(<FormationType>'no such formation');
    }).toThrow();
  });

  it('create should handle 4-3-3', () => {
    const expectedFormation: Formation = {
      type: FormationType.F4_3_3,
      forward1: {
        id: 'FWD1',
        positions: [{id: 'S', type: 'S'}]
      },
      forward2: {
        id: 'FWD2',
        positions: [
          {id: 'LW', type: 'W'},
          {id: 'RW', type: 'W'}
        ]
      },
      midfield1: {
        id: 'MID1',
        positions: [
          {id: 'AM1', type: 'AM'},
          {id: 'AM2', type: 'AM'}
        ]
      },
      midfield2: {
        id: 'MID2',
        positions: [{id: 'HM', type: 'HM'}]
      },
      defense: {
        id: 'DEF',
        positions: [
          {id: 'LFB', type: 'FB'},
          {id: 'LCB', type: 'CB'},
          {id: 'RCB', type: 'CB'},
          {id: 'RFB', type: 'FB'},
        ]
      },
      gk: {
        id: 'GK',
        positions: [{id: 'GK', type: 'GK'}]
      },
    };

    const new4_3_3: Formation = FormationBuilder.create(FormationType.F4_3_3);

    expect(new4_3_3).toEqual(expectedFormation);
  });

});
