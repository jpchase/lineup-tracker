import { DocumentData } from '@firebase/firestore-types';
import { RootState } from './store';
import { currentUserIdSelector } from './reducers/auth';

export function buildNewDocumentData(model: any, state: RootState): DocumentData {
  const data: DocumentData = {
    ...model,
    owner_uid: currentUserIdSelector(state)
  };
  // Ensure there is no 'id' property, as that will prevent a unique id from being generated.
  delete data.id;

  return data;
}

