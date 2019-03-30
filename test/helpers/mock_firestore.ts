const setMock = jest.fn(() => { return Promise.resolve(); });
const docMock = jest.fn(() => {
  return {
    set: setMock
  };
});
const addMock = jest.fn(() => { return Promise.resolve(); });
const collectionMock = jest.fn(() => {
  return { add: addMock, doc: docMock };
});

const firestore = () => {
  return { collection: collectionMock };
};

export { collectionMock, firestore };
