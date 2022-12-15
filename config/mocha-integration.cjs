module.exports = {
  extension: ['js'],
  spec: ['test/integration'],
  timeout: '25000',
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
