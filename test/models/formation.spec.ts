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
        positions: ['S']
      },
      forward2: {
        positions: ['W', 'W']
      },
      midfield1: {
        positions: ['AM', 'AM']
      },
      midfield2: {
        positions: ['HM']
      },
      defense: {
        positions: ['FB', 'CB', 'CB', 'FB']
      },
      gk: {
        positions: ['GK']
      },

    };

    const new4_3_3: Formation = FormationBuilder.create(FormationType.F4_3_3);

    expect(new4_3_3).toEqual(expectedFormation);
  });

});
