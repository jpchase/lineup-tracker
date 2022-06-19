/**
@license
*/

export enum FormationType {
  F4_3_3 = '4-3-3',
  F3_1_4_2 = '3-1-4-2',
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
  selected?: boolean;
}

export class FormationBuilder {
  static create(type: FormationType): Formation {
    if (type === FormationType.F4_3_3) {
      return {
        type: FormationType.F4_3_3,
        forward1: {
          id: 'FWD1',
          positions: [{ id: 'S', type: 'S' }]
        },
        forward2: {
          id: 'FWD2',
          positions: [
            { id: 'LW', type: 'W' },
            { id: 'RW', type: 'W' }
          ]
        },
        midfield1: {
          id: 'MID1',
          positions: [
            { id: 'AM1', type: 'AM' },
            { id: 'AM2', type: 'AM' }
          ]
        },
        midfield2: {
          id: 'MID2',
          positions: [{ id: 'HM', type: 'HM' }]
        },
        defense: {
          id: 'DEF',
          positions: [
            { id: 'LFB', type: 'FB' },
            { id: 'LCB', type: 'CB' },
            { id: 'RCB', type: 'CB' },
            { id: 'RFB', type: 'FB' },
          ]
        },
        gk: {
          id: 'GK',
          positions: [{ id: 'GK', type: 'GK' }]
        },
      };
    }
    if (type === FormationType.F3_1_4_2) {
      return {
        type: FormationType.F3_1_4_2,
        forward1: {
          id: 'FWD1',
          positions: [
            { id: 'S1', type: 'S' },
            { id: 'S2', type: 'S' }
          ]
        },
        forward2: {
          id: 'FWD2',
          positions: []
        },
        midfield1: {
          id: 'MID1',
          positions: [
            { id: 'LW', type: 'W' },
            { id: 'AM1', type: 'AM' },
            { id: 'AM2', type: 'AM' },
            { id: 'RW', type: 'W' }
          ]
        },
        midfield2: {
          id: 'MID2',
          positions: [{ id: 'HM', type: 'HM' }]
        },
        defense: {
          id: 'DEF',
          positions: [
            { id: 'LFB', type: 'FB' },
            { id: 'CB', type: 'CB' },
            { id: 'RFB', type: 'FB' },
          ]
        },
        gk: {
          id: 'GK',
          positions: [{ id: 'GK', type: 'GK' }]
        },
      };
    }
    throw new Error(`Unsupported formation type: ${type}`);
  }
}

export function formatPosition(position: Position): string {
  let positionText = position.type;

  if (position.id !== position.type) {
    let addition = '';
    if (position.id[0] === 'L') {
      addition = 'Left';
    } else if (position.id[0] === 'R') {
      addition = 'Right';
    } else if (position.id.length > position.type.length) {
      addition = position.id.substring(position.type.length);
    }
    positionText += ` (${addition})`;
  }
  return positionText;
}

export function getPositions(formation: Formation): Position[] {
  return [
    formation.forward1, formation.forward2,
    formation.midfield1, formation.midfield2,
    formation.defense,
    formation.gk
  ].reduce((result: Position[], formationLine) => {
    result.push(...formationLine.positions);
    return result;
  }, []);
}
