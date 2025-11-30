// Global setup for Jest - runs once before all tests
module.exports = async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error';

  console.log('🧪 Jest Global Setup: Initializing TypeORM...');

  // Import and initialize TypeORM
  const { initializeDatabase } = require('../src/config/typeorm');

  try {
    await initializeDatabase();
    console.log('✅ Jest Global Setup: TypeORM initialized successfully');
  } catch (error) {
    console.error('❌ Jest Global Setup: Failed to initialize TypeORM:', error.message);
    throw error;
  }
};
