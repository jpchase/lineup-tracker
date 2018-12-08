import { RootAction } from '../../src/store.js';

export function getFakeAction(): RootAction {
    // This must be a real action type, due to type checking. Using the offline
    // action as it will be unknown to all the lineup-specific actions/reducers.
    return { type: 'UPDATE_OFFLINE', offline: true };
}
