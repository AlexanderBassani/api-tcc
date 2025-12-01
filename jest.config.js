module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  testPathIgnorePatterns: ['/node_modules/', '/__tests__/helpers/', '/__tests__/setup.js', '/__tests__/setupAfterEnv.js', '/__tests__/globalSetup.js', '/__tests__/globalTeardown.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFiles: ['<rootDir>/__tests__/setup.js'],
  setupFilesAfterEnv: ['<rootDir>/__tests__/setupAfterEnv.js'],
  globalSetup: '<rootDir>/__tests__/globalSetup.js',
  globalTeardown: '<rootDir>/__tests__/globalTeardown.js',
  maxWorkers: 1, // Rodar testes sequencialmente para evitar problemas de conexão
  forceExit: true,
  testTimeout: 30000
};