import { DocumentData } from '@firebase/firestore-types';
import { RootState } from './store';
import { currentUserIdSelector } from './reducers/auth';
import { currentTeamIdSelector } from './reducers/team';

export function buildNewDocumentData(model: any, state: RootState, addTeamId?: boolean): DocumentData {
  const data: DocumentData = {
    ...model,
    owner_uid: currentUserIdSelector(state)
  };
  // Ensure there is no 'id' property, as that will prevent a unique id from being generated.
  delete data.id;
  if (addTeamId) {
    data.teamId = currentTeamIdSelector(state);
  }

  return data;
}

