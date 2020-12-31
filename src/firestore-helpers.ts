import {
  CollectionReference,
  DocumentData, DocumentReference, DocumentSnapshot, FirebaseFirestore,
  QueryDocumentSnapshot, QuerySnapshot
} from '@firebase/firestore-types';
import { debug, debugError } from './common/debug';
import { useTestData } from './init';
import { Game } from './models/game';
import { Player, PlayerStatus, Roster } from './models/player';
import { currentUserIdSelector } from './reducers/auth';
import { currentTeamIdSelector } from './reducers/team';
import { RootState } from './store';

const debugFirestore = debug('firestore');

export const KEY_GAMES = 'games';
export const KEY_ROSTER = 'roster';
export const KEY_TEAMS = 'teams';

export interface NewDocOptions {
  addTeamId?: boolean;
  addUserId?: boolean;
  keepExistingId?: boolean;
}

export function buildNewDocumentData(model: any, state?: RootState, options?: NewDocOptions): DocumentData {
  const data: DocumentData = {
    ...model,
  };
  // Ensure there is no 'id' property, as that will prevent a unique id from being generated.
  if (!options || !options.keepExistingId) {
    delete data.id;
  }
  // Add parent ids, if necessary.
  if (options && state) {
    if (options.addTeamId) {
      data.teamId = currentTeamIdSelector(state);
    }
    if (options.addUserId) {
      data.owner_uid = currentUserIdSelector(state);
      debugFirestore(`buildNewDocumentData: owner_uid = ${data.owner_uid}`);
      if (!data.owner_uid) {
        throw new Error('No current user to set owner_uid');
      }
    }
  }
  return data;
}

export function saveNewDocument(model: any, collection: CollectionReference, state?: RootState, options?: NewDocOptions) {
  const data = buildNewDocumentData(model, state, options);

  // Unless requested to use model id, omit the doc path, which will cause a new unique id to be
  // generated.
  // NOTE: Firestore requires the parameter to be omitted entirely, it will throw for any value
  // that is not a non-empty string.
  const doc: DocumentReference = (options && options.keepExistingId && model.id) ?
    collection.doc(model.id) : collection.doc();
  debugFirestore(`saveNewDocument: data = ${JSON.stringify(data)}`);
  if (useTestData()) {
    debugFirestore('saveNewDocument: useTestData');
    (() => {
      debugFirestore('saveNewDocument: about to call set');
      doc.set(data).then(result => {
        debugFirestore('saveNewDocument: then -> ', result);
      }).catch((reason: any) => {
        debugError(`saveNewDocument: failed - ${reason}`);
      });
    })();
    debugFirestore('saveNewDocument: after iife');
  } else {
    debugFirestore('saveNewDocument: not useTestData');
    doc.set(data);
  }
  debugFirestore(`saveNewDocument: after, data = ${JSON.stringify(data)}`);
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
        positions: data.positions || [],
        status: data.status
      };
      roster[player.id] = player;
    });

    debugFirestore(`loadRoster for [${collectionPath}]: ${JSON.stringify(roster)}`);
    return roster;
  });
}

export function savePlayerToGameRoster(newPlayer: Player, firestore: FirebaseFirestore, gameId: string, options?: NewDocOptions) {
  savePlayerToRoster(newPlayer, firestore, buildGameRosterPath(gameId), options);
}

export function savePlayerToTeamRoster(newPlayer: Player, firestore: FirebaseFirestore, teamId: string) {
  savePlayerToRoster(newPlayer, firestore, buildTeamRosterPath(teamId));
}

function savePlayerToRoster(newPlayer: Player, firestore: FirebaseFirestore, collectionPath: string, options?: NewDocOptions) {
  const collection = firestore.collection(collectionPath);
  if (!newPlayer.status) {
    newPlayer.status = PlayerStatus.Off;
  }
  if (!newPlayer.positions) {
    newPlayer.positions = [];
  }
  saveNewDocument(newPlayer, collection, undefined, options);
};
