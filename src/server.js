const app = require('./app');

const PORT = process.env.PORT || 3000;

// Start server after TypeORM is initialized
const startServer = async () => {
  try {
    // Wait for TypeORM to initialize
    await app.typeormReady;

    // Start Express server
    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
};

startServer();