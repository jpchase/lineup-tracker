module.exports = {
  extension: ['js'],
  spec: ['test/integration'],
  // spec: ['test/integration/functional.js', 'test/integration/router.js', 'test/integration/visual.js'],
  timeout: '15000',
  reporter: 'mochawesome',
  'reporter-option': [
    'reportDir=reports/tests-integration',
    'reportFilename=integration-tests',
    'reportPageTitle=Integration Tests',
    // quiet: true,
  ],
  // reporter: 'min',
  // 'reporter-option': ['foo=bar', 'baz=quux']
};
