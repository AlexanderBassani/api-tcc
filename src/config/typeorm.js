const { DataSource } = require('typeorm');
const path = require('path');
require('dotenv').config();

// Importar todas as entidades
const User = require('../entities/User');
const UserPreference = require('../entities/UserPreference');
const Vehicle = require('../entities/Vehicle');
const MaintenanceType = require('../entities/MaintenanceType');
const ServiceProvider = require('../entities/ServiceProvider');
const Maintenance = require('../entities/Maintenance');
const MaintenanceAttachment = require('../entities/MaintenanceAttachment');
const FuelRecord = require('../entities/FuelRecord');
const Reminder = require('../entities/Reminder');

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'api_db',
  synchronize: false, // Nunca true em produção - usamos migrations
  logging: process.env.NODE_ENV === 'development',
  entities: [
    User,
    UserPreference,
    Vehicle,
    MaintenanceType,
    ServiceProvider,
    Maintenance,
    MaintenanceAttachment,
    FuelRecord,
    Reminder
  ],
  migrations: [path.join(__dirname, '../migrations/*{.ts,.js}')],
  subscribers: [],
  // Configurações adicionais
  extra: {
    max: 20, // máximo de conexões no pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  }
});

// Inicializar a conexão
const initializeDatabase = async () => {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('✅ TypeORM Data Source inicializado com sucesso!');
    }
    return AppDataSource;
  } catch (error) {
    console.error('❌ Erro ao inicializar TypeORM Data Source:', error);
    throw error;
  }
};

// Fechar a conexão
const closeDatabase = async () => {
  try {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('✅ TypeORM Data Source fechado com sucesso!');
    }
  } catch (error) {
    console.error('❌ Erro ao fechar TypeORM Data Source:', error);
    throw error;
  }
};

module.exports = {
  AppDataSource,
  initializeDatabase,
  closeDatabase
};
