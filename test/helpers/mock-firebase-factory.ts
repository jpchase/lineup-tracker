import { firebaseRef } from '@app/firebase';
import MockFirebase from 'mock-cloud-firestore';
import * as sinon from 'sinon';
import { getStoredGameData, getStoredPlayerData, getStoredTeamData, OTHER_STORED_GAME_ID, STORED_GAME_ID, TEST_USER_ID } from './test_data';

const mockFirebaseData = {
  __collection__: {
    games: {
      __doc__: {
        [STORED_GAME_ID]: {
          ...getStoredGameData(),
          owner_uid: TEST_USER_ID,

          __collection__: {
            roster: {
              __doc__: {
                sp1: {
                  ...getStoredPlayerData()
                }
              }
            }
          }
        },
        [OTHER_STORED_GAME_ID]: {
          ...getStoredGameData(),
          owner_uid: TEST_USER_ID,
        },
        sgOther: {
          ...getStoredGameData(),
          teamId: 'otherTeam',
          owner_uid: TEST_USER_ID,
        },
      }
    },
    teams: {
      __doc__: {
        st1: {
          ...getStoredTeamData(),
          owner_uid: TEST_USER_ID,

          __collection__: {
            roster: {
              __doc__: {
                sp1: {
                  ...getStoredPlayerData()
                }
              }
            }
          }
        },
      }
    }
  }
};

export function getMockFirebase(): any {
  return new MockFirebase(mockFirebaseData);
}

export function mockFirestoreAccessor(mockFirebase?: any): sinon.SinonStub {
  const mockInstance = mockFirebase || getMockFirebase();

  return sinon.stub(firebaseRef, 'firestore').callsFake(() => {
    return mockInstance.firestore();
  });
}