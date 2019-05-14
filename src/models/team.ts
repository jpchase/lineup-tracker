/**
@license
*/

export interface Team {
  id: string;
  name: string;
}

export interface Teams {
  [index: string]: Team;
}
