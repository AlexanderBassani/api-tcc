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

    // Criar tabela de preferências do usuário
    const createUserPreferencesTable = `
      CREATE TABLE IF NOT EXISTS user_preferences (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL UNIQUE,
        theme_mode VARCHAR(20) DEFAULT 'system' CHECK (theme_mode IN ('light', 'dark', 'system')),
        theme_color VARCHAR(30) DEFAULT 'blue',
        font_size VARCHAR(20) DEFAULT 'medium' CHECK (font_size IN ('small', 'medium', 'large', 'extra-large')),
        compact_mode BOOLEAN DEFAULT FALSE,
        animations_enabled BOOLEAN DEFAULT TRUE,
        high_contrast BOOLEAN DEFAULT FALSE,
        reduce_motion BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_user_preferences_user
          FOREIGN KEY (user_id)
          REFERENCES users(id)
          ON DELETE CASCADE
      )
    `;

    const createUserPreferencesTrigger = `
      DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;
      CREATE TRIGGER update_user_preferences_updated_at
        BEFORE UPDATE ON user_preferences
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `;

    const createUserPreferencesIndexes = `
      CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_preferences_theme_mode ON user_preferences(theme_mode);
    `;

    await pool.query(createUpdateFunction);
    await pool.query(createUsersTable);
    await pool.query(createUpdateTrigger);
    await pool.query(createIndexes);
    await pool.query(createUserPreferencesTable);
    await pool.query(createUserPreferencesTrigger);
    await pool.query(createUserPreferencesIndexes);

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
      RETURNING id
    `;

    const adminResult = await pool.query(insertAdmin, [passwordHash]);
    const adminId = adminResult.rows[0].id;

    // Criar preferências padrão para o admin
    await pool.query(
      `INSERT INTO user_preferences (
        user_id, theme_mode, theme_color, font_size,
        compact_mode, animations_enabled, high_contrast, reduce_motion
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [adminId, 'system', 'blue', 'medium', false, true, false, false]
    );

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