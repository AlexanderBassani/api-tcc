module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  testPathIgnorePatterns: ['/node_modules/', '/__tests__/helpers/', '/__tests__/setup.js', '/__tests__/globalSetup.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFiles: ['<rootDir>/__tests__/setup.js'],
  setupFilesAfterEnv: [],
  globalSetup: '<rootDir>/__tests__/globalSetup.js',
  globalTeardown: undefined,
  forceExit: true,
  testTimeout: 30000
};