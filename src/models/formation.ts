/**
@license
*/

export enum FormationType {
  F4_3_3 = '4-3-3',
}

export interface FormationLine {
  id: string;
  positions: Position[];
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

export interface Position {
  id: string;
  type: string;
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
  }
}
