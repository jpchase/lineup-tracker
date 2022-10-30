module.exports = {
  ci: {
    collect: {
      puppeteerScript: 'config/lighthouse-ci-init.js',
      startServerCommand: 'npm run serve:test',
      startServerReadyTimeout: 90000,
      settings: { disableStorageReset: true },
      url: [
        'http://localhost:8791/viewRoster?team=test_team1'
      ]
    },
    // assert: {
    //   preset: 'lighthouse:recommended',
    // },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
