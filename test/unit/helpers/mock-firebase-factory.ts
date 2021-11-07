import MockFirebase from 'mock-cloud-firestore';
import {
  getPublicGameData, getPublicTeamData, getStoredGameData, getStoredPlayerData, getStoredTeamData,
  OTHER_STORED_GAME_ID, PUBLIC_GAME_ID, STORED_GAME_ID, TEST_USER_ID
} from './test_data';

function getMockFirebaseData(): any {
  return {
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
          [PUBLIC_GAME_ID]: {
            ...getPublicGameData(),
            public: true,
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
          pt1: {
            ...getPublicTeamData(),
            public: true,

            __collection__: {
              roster: {
                __doc__: {
                  pp1: {
                    name: 'Public player 1',
                    uniformNumber: 5,
                    positions: ['CB'],
                    status: 'OFF'
                  }
                }
              }
            }
          },
        }
      }
    }
  };
}

export function getMockFirebase(): any {
  return new MockFirebase(getMockFirebaseData());
}
