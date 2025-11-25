module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  testPathIgnorePatterns: ['/node_modules/', '/__tests__/helpers/', '/__tests__/setup.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFiles: ['<rootDir>/__tests__/setup.js'],
  testEnvironment: 'node',
  setupFilesAfterEnv: [],
  globalSetup: undefined,
  globalTeardown: undefined,
  // Force NODE_ENV to be test
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/__tests__/setup.js'],
  forceExit: true,
  testTimeout: 30000
};