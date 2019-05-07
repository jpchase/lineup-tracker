module.exports = {
  preset: 'ts-jest/presets/js-with-babel',
  testEnvironment: './test/idb-environment',
  globals: {
    'ts-jest': {
      diagnostics: {
        ignoreCodes: [18002, 18003, 'TS151001']
      }
    }
  },
  moduleNameMapper: {
    '^@app/(.*)$': '<rootDir>/src/$1'
  },
  setupFiles: ['<rootDir>/test/globals-test.js']
};
