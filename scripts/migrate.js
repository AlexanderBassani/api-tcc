const fs = require('fs');
const path = require('path');
const pool = require('../src/config/database');

const migrationsDir = path.join(__dirname, '../src/migrations');

const createMigrationsTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

const getExecutedMigrations = async () => {
  const result = await pool.query('SELECT name FROM migrations ORDER BY id');
  return result.rows.map(row => row.name);
};

const recordMigration = async (name) => {
  await pool.query('INSERT INTO migrations (name) VALUES ($1)', [name]);
};

const removeMigration = async (name) => {
  await pool.query('DELETE FROM migrations WHERE name = $1', [name]);
};

const runMigrations = async () => {
  try {
    console.log('Iniciando execução de migrations...\n');

    await createMigrationsTable();
    const executedMigrations = await getExecutedMigrations();

    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.js'))
      .sort();

    let executed = 0;

    for (const file of files) {
      const migrationName = file.replace('.js', '');

      if (executedMigrations.includes(migrationName)) {
        console.log(`⏭️  ${migrationName} - já executada`);
        continue;
      }

      const migration = require(path.join(migrationsDir, file));

      console.log(`🔄 Executando: ${migrationName}`);
      await migration.up();
      await recordMigration(migrationName);
      console.log(`✅ ${migrationName} - concluída\n`);

      executed++;
    }

    if (executed === 0) {
      console.log('✨ Todas as migrations já foram executadas!');
    } else {
      console.log(`\n✅ ${executed} migration(s) executada(s) com sucesso!`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao executar migrations:', error);
    process.exit(1);
  }
};

const rollbackMigration = async () => {
  try {
    console.log('Revertendo última migration...\n');

    await createMigrationsTable();
    const executedMigrations = await getExecutedMigrations();

    if (executedMigrations.length === 0) {
      console.log('Nenhuma migration para reverter');
      process.exit(0);
    }

    const lastMigration = executedMigrations[executedMigrations.length - 1];
    const migrationFile = path.join(migrationsDir, `${lastMigration}.js`);

    if (!fs.existsSync(migrationFile)) {
      console.error(`Arquivo de migration não encontrado: ${lastMigration}.js`);
      process.exit(1);
    }

    const migration = require(migrationFile);

    console.log(`🔄 Revertendo: ${lastMigration}`);
    await migration.down();
    await removeMigration(lastMigration);
    console.log(`✅ ${lastMigration} - revertida com sucesso!`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao reverter migration:', error);
    process.exit(1);
  }
};

const showStatus = async () => {
  try {
    await createMigrationsTable();
    const executedMigrations = await getExecutedMigrations();

    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.js'))
      .sort();

    console.log('\n📋 Status das migrations:\n');

    for (const file of files) {
      const migrationName = file.replace('.js', '');
      const isExecuted = executedMigrations.includes(migrationName);
      const status = isExecuted ? '✅' : '⏸️';
      console.log(`${status} ${migrationName}`);
    }

    console.log(`\n${executedMigrations.length}/${files.length} migrations executadas\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao verificar status:', error);
    process.exit(1);
  }
};

// Processar argumentos da linha de comando
const command = process.argv[2];

switch (command) {
  case 'up':
    runMigrations();
    break;
  case 'down':
    rollbackMigration();
    break;
  case 'status':
    showStatus();
    break;
  default:
    console.log(`
Uso: node scripts/migrate.js [comando]

Comandos:
  up      - Executa todas as migrations pendentes
  down    - Reverte a última migration executada
  status  - Mostra o status de todas as migrations

Exemplos:
  npm run migrate:up
  npm run migrate:down
  npm run migrate:status
    `);
    process.exit(0);
}