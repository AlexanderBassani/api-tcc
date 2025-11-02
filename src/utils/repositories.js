const AppDataSource = require('../config/database');

// Helper para acessar repositories de forma fácil
const getRepository = (entityName) => {
  if (!AppDataSource.isInitialized) {
    throw new Error('DataSource is not initialized');
  }
  return AppDataSource.getRepository(entityName);
};

// Exports de repositories específicos para facilitar uso
const getUserRepository = () => getRepository('User');
const getUserPreferencesRepository = () => getRepository('UserPreferences');

module.exports = {
  getRepository,
  getUserRepository,
  getUserPreferencesRepository
};
