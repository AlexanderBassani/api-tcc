const pool = require('../config/database');

const up = async () => {
  try {
    console.log('Executando migration: Adicionar coluna role à tabela users');

    // Adicionar coluna role
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user'
      CHECK (role IN ('admin', 'user'))
    `);

    console.log('Coluna role adicionada com sucesso');

    // Atualizar usuário admin existente (se houver)
    const result = await pool.query(`
      UPDATE users
      SET role = 'admin'
      WHERE username = 'admin' OR email = 'admin@sistema.com'
      RETURNING id, username, email, role
    `);

    if (result.rows.length > 0) {
      console.log('Usuário admin atualizado:', result.rows[0]);
    }

    console.log('Migration 001_add_role_to_users executada com sucesso!');
  } catch (error) {
    console.error('Erro ao executar migration:', error);
    throw error;
  }
};

const down = async () => {
  try {
    console.log('Revertendo migration: Remover coluna role da tabela users');

    await pool.query(`
      ALTER TABLE users
      DROP COLUMN IF EXISTS role
    `);

    console.log('Migration 001_add_role_to_users revertida com sucesso!');
  } catch (error) {
    console.error('Erro ao reverter migration:', error);
    throw error;
  }
};

module.exports = { up, down };