/** @format */

module.exports = {
  extension: ['js'],
  spec: ['out-tsc/test/integration'],
  timeout: '40000',
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
