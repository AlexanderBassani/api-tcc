// Setup que roda DEPOIS do Jest ser configurado, mas ANTES de cada teste
// Garante que TypeORM está inicializado antes dos testes rodarem

beforeAll(async () => {
  const app = require('../src/app');

  // Aguardar TypeORM estar pronto
  if (app.typeormReady) {
    await app.typeormReady;
    console.log('🧪 Setup: TypeORM ready for tests');
  }
});
