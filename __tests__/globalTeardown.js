// Global teardown for Jest - runs once after all tests
module.exports = async () => {
  console.log('🧪 Jest Global Teardown: Closing connections...');

  try {
    // Close database pool
    const pool = require('../src/config/database');
    if (pool) {
      await pool.end();
      console.log('✅ Database pool closed');
    }

    // Close TypeORM DataSource
    const { AppDataSource } = require('../src/config/typeorm');
    if (AppDataSource && AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('✅ TypeORM DataSource closed');
    }

    console.log('✅ Jest Global Teardown: All connections closed successfully');
  } catch (error) {
    console.error('❌ Jest Global Teardown: Error closing connections:', error.message);
  }
};
