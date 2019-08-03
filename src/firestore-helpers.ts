import {
  FirebaseFirestore,
  CollectionReference,
  DocumentData, DocumentReference, DocumentSnapshot,
  QueryDocumentSnapshot, QuerySnapshot
} from '@firebase/firestore-types';
import { RootState } from './store';
import { Player, Roster } from './models/player';
import { Game } from './models/game';
import { currentUserIdSelector } from './reducers/auth';
import { currentTeamIdSelector } from './reducers/team';

export const KEY_GAMES = 'games';
export const KEY_ROSTER = 'roster';
export const KEY_TEAMS = 'teams';

export interface NewDocOptions {
  addTeamId?: boolean;
}

export function buildNewDocumentData(model: any, state: RootState, options?: NewDocOptions): DocumentData {
  const data: DocumentData = {
    ...model,
    owner_uid: currentUserIdSelector(state)
  };
  // Ensure there is no 'id' property, as that will prevent a unique id from being generated.
  delete data.id;
  if (options && options.addTeamId) {
    data.teamId = currentTeamIdSelector(state);
  }

  return data;
}

export function saveNewDocument(model: any, collection: CollectionReference, state: RootState, options?: NewDocOptions) {
  const data = buildNewDocumentData(model, state, options);

  const doc: DocumentReference = collection.doc();
  doc.set(data);
  model.id = doc.id;
}

export function extractGame(document: DocumentSnapshot): Game {
  // Caller is responsible for ensuring data exists
  const data: DocumentData = document.data()!;
  const game: Game = {
    id: document.id,
    teamId: data.teamId,
    status: data.status,
    name: data.name,
    date: data.date.toDate(),
    opponent: data.opponent
  };
  return game;
}

export function buildGameRosterPath(gameId: string) {
  return `${KEY_GAMES}/${gameId}/${KEY_ROSTER}`;
}

export function buildTeamRosterPath(teamId: string) {
  return `${KEY_TEAMS}/${teamId}/${KEY_ROSTER}`;
}

export function loadTeamRoster(firestore: FirebaseFirestore, teamId: string): Promise<Roster> {
  return loadRoster(firestore, buildTeamRosterPath(teamId));
}

export function loadGameRoster(firestore: FirebaseFirestore, gameId: string): Promise<Roster> {
  return loadRoster(firestore, buildGameRosterPath(gameId));
}

function loadRoster(firestore: FirebaseFirestore, collectionPath: string): Promise<Roster> {
  // TODO: Add try/catch for firestore/collection/get calls?
  return firestore.collection(collectionPath).get().then((value: QuerySnapshot) => {
    const roster = {} as Roster;

    value.forEach((result: QueryDocumentSnapshot) => {
      const data: DocumentData = result.data();
      const player: Player = {
        id: result.id,
        name: data.name,
        uniformNumber: data.uniformNumber,
        positions: data.positions,
        status: data.status
      };
      roster[player.id] = player;
    });

    console.log(`loadRoster for [${collectionPath}]: ${JSON.stringify(roster)}`);
    return roster;
  });
}
