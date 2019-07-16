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
        positions: ['S']
      },
      forward2: {
        id: 'FWD2',
        positions: ['W', 'W']
      },
      midfield1: {
        id: 'MID1',
        positions: ['AM', 'AM']
      },
      midfield2: {
        id: 'MID2',
        positions: ['HM']
      },
      defense: {
        id: 'DEF',
        positions: ['FB', 'CB', 'CB', 'FB']
      },
      gk: {
        id: 'GK',
        positions: ['GK']
      },
    };

    const new4_3_3: Formation = FormationBuilder.create(FormationType.F4_3_3);

    expect(new4_3_3).toEqual(expectedFormation);
  });

});
