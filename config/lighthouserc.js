module.exports = {
  ci: {
    collect: {
      puppeteerScript: 'config/lighthouse-ci-init.js',
      startServerCommand: 'npm run serve:test',
      url: [
        'http://localhost:8791/viewRoster?team=test_team1'
      ]
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
