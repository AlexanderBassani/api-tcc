const { createTables } = require('../src/config/initDb');

const init = async () => {
  console.log('Inicializando banco de dados...');
  await createTables();
  process.exit(0);
};

init().catch(error => {
  console.error('Erro ao inicializar banco:', error);
  process.exit(1);
});