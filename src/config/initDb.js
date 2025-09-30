const pool = require('./database');
const bcrypt = require('bcrypt');

const createTables = async () => {
  try {
    // Criar função para atualizar updated_at automaticamente
    const createUpdateFunction = `
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `;

    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(50) NOT NULL,
        last_name VARCHAR(50) NOT NULL,
        username VARCHAR(30) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
        phone VARCHAR(20),
        date_of_birth DATE,
        gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
        profile_image_url VARCHAR(500),
        bio TEXT,
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'deleted')),
        email_verified BOOLEAN DEFAULT FALSE,
        phone_verified BOOLEAN DEFAULT FALSE,
        two_factor_enabled BOOLEAN DEFAULT FALSE,
        preferred_language VARCHAR(10) DEFAULT 'pt-BR',
        timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
        last_login_at TIMESTAMP,
        login_attempts INTEGER DEFAULT 0,
        locked_until TIMESTAMP,
        password_reset_token VARCHAR(255),
        password_reset_expires TIMESTAMP,
        email_verification_token VARCHAR(255),
        email_verification_expires TIMESTAMP,
        terms_accepted_at TIMESTAMP,
        privacy_policy_accepted_at TIMESTAMP,
        marketing_emails_consent BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      )
    `;

    // Criar trigger para atualizar updated_at
    const createUpdateTrigger = `
      DROP TRIGGER IF EXISTS update_users_updated_at ON users;
      CREATE TRIGGER update_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `;

    // Criar índices para melhor performance
    const createIndexes = `
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
      CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
      CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);
    `;

    await pool.query(createUpdateFunction);
    await pool.query(createUsersTable);
    await pool.query(createUpdateTrigger);
    await pool.query(createIndexes);

    // Criar usuário administrador padrão
    await createDefaultAdmin();

    console.log('Tabelas, triggers, índices e usuário admin criados com sucesso!');
  } catch (error) {
    console.error('Erro ao criar tabelas:', error);
  }
};

const createDefaultAdmin = async () => {
  try {
    // Verificar se já existe um usuário admin
    const existingAdmin = await pool.query(
      "SELECT id FROM users WHERE username = 'admin' OR email = 'admin@sistema.com'"
    );

    if (existingAdmin.rows.length > 0) {
      console.log('Usuário administrador já existe');
      return;
    }

    // Criar hash da senha padrão
    const defaultPassword = 'admin123';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    // Inserir usuário administrador
    const insertAdmin = `
      INSERT INTO users (
        first_name,
        last_name,
        username,
        email,
        password_hash,
        role,
        email_verified,
        status,
        terms_accepted_at,
        privacy_policy_accepted_at
      ) VALUES (
        'Administrador',
        'Sistema',
        'admin',
        'admin@sistema.com',
        $1,
        'admin',
        true,
        'active',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
    `;

    await pool.query(insertAdmin, [passwordHash]);
    console.log('Usuário administrador criado:');
    console.log('  Email: admin@sistema.com');
    console.log('  Username: admin');
    console.log('  Senha: admin123');
    console.log('  IMPORTANTE: Altere a senha após o primeiro login!');

  } catch (error) {
    console.error('Erro ao criar usuário administrador:', error);
  }
};

module.exports = { createTables };