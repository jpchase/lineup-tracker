/**
@license
*/

export enum FormationType {
  F4_3_3 = '4-3-3',
}

export interface FormationLine {
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
  }
}
