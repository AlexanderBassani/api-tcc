// Global setup for Jest - runs once before all tests
module.exports = async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error';

  console.log('🧪 Jest Global Setup: Test environment configured');

  // Note: TypeORM initialization is now handled in app.js
  // which runs in the same context as tests, avoiding context isolation issues
};
