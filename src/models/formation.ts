/**
@license
*/

export enum FormationType {
  F4_3_3 = '4-3-3',
}

export interface FormationLine {
  id: string;
  positions: string[];
}

export interface FormationMetadata {
  name?: string;
  type: FormationType;
}

export interface Formation extends FormationMetadata {
  forward1: FormationLine;
  forward2: FormationLine;
  midfield1: FormationLine;
  midfield2: FormationLine;
  defense: FormationLine;
  gk: FormationLine;
}

export class FormationBuilder {
  static create(type: FormationType): Formation {
    if (type !== FormationType.F4_3_3) {
      throw new Error(`Unsupported formation type: ${type}`);
    }
    return {
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
  }
}
