require('reflect-metadata'); // Necessário para TypeORM
const app = require('./app');
const AppDataSource = require('./config/database');
const logger = require('./config/logger');

const PORT = process.env.PORT || 3000;

// Inicializar TypeORM DataSource antes de iniciar o servidor
AppDataSource.initialize()
  .then(() => {
    logger.info('TypeORM DataSource initialized successfully', {
      database: process.env.DB_NAME || 'api_db',
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432
    });

    // Iniciar servidor após conexão com banco
    app.listen(PORT, () => {
      logger.info('Server started successfully', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version
      });
      console.log(`Servidor rodando na porta ${PORT}`);
    });
  })
  .catch((error) => {
    logger.error('Error during TypeORM DataSource initialization', {
      message: error.message,
      stack: error.stack
    });
    console.error('Erro ao conectar no banco de dados:', error);
    process.exit(1);
  });