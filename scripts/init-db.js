require('reflect-metadata'); // Necessário para TypeORM
const { createTables } = require('../src/config/initDb');
const AppDataSource = require('../src/config/database');

const init = async () => {
  console.log('\n🚀 Iniciando configuração do banco de dados...\n');

  try {
    // Inicializar TypeORM DataSource
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('✅ TypeORM DataSource conectado com sucesso!\n');
    }

    // Criar tabelas e usuário admin
    await createTables();

    console.log('\n🎉 Banco de dados configurado com sucesso!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erro ao inicializar banco:', error.message);
    console.error('\nDetalhes:', error);
    process.exit(1);
  }
};

init();
