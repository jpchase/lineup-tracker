const setMock = jest.fn(() => { return Promise.resolve(); });
const docMock = jest.fn(() => {
  return {
    set: setMock
  };
});
const addMock = jest.fn(() => { return Promise.resolve({id: 'theId'}); });
let itemCount = 0;
const querySnapshotMock = {
    forEach: jest.fn((callback) => {
        if (!collectionData.getSnapshot) {
            return;
        }
        const item = collectionData.getSnapshot![itemCount++];
        if (!item) {
            return;
        }
        callback({ id: item.id, data: () => { return item; }});
    })
};
const getMock = jest.fn(() => { return Promise.resolve(querySnapshotMock); });
const collectionMock = jest.fn(() => {
  return { add: addMock, doc: docMock, get: getMock };
});

interface CollectionData {
    getSnapshot: any;
}
const collectionData: CollectionData = {
    getSnapshot: undefined
};

const firestore = () => {
  return { collection: collectionMock };
};

export { collectionMock, collectionData, firestore };
