const { DataSource } = require('typeorm');
require('dotenv').config();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'api_db',

  // Configurações de segurança
  synchronize: false, // NUNCA use true em produção!
  logging: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : false,

  // Entities
  entities: [
    __dirname + '/../entities/**/*.js'
  ],

  // Migrations (desabilitado por enquanto - não migradas ainda)
  migrations: [],

  // Subscribers (eventos)
  subscribers: [],

  // Pool de conexões
  extra: {
    max: 10, // máximo de conexões no pool
    min: 2,  // mínimo de conexões no pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  }
});

// Não inicializar aqui, será feito no server.js
module.exports = AppDataSource;
