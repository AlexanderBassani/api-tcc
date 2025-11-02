const AppDataSource = require('./database');
const { getUserRepository, getUserPreferencesRepository } = require('../utils/repositories');
const bcrypt = require('bcrypt');
const logger = require('./logger');

const createTables = async () => {
  try {
    // Inicializar DataSource se ainda não estiver
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      logger.info('TypeORM DataSource initialized for init-db');
    }

    // Usar query runner para executar SQL direto (manter compatibilidade)
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();

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

    // Executar todas as queries SQL
    await queryRunner.query(createUpdateFunction);
    await queryRunner.query(createUsersTable);
    await queryRunner.query(createUpdateTrigger);
    await queryRunner.query(createIndexes);
    await queryRunner.query(createUserPreferencesTable);
    await queryRunner.query(createUserPreferencesTrigger);
    await queryRunner.query(createUserPreferencesIndexes);

    // Liberar query runner
    await queryRunner.release();

    // Criar usuário administrador padrão usando TypeORM
    await createDefaultAdmin();

    console.log('✅ Tabelas, triggers, índices e usuário admin criados com sucesso!');
    logger.info('Database initialized successfully');

  } catch (error) {
    console.error('❌ Erro ao criar tabelas:', error);
    logger.error('Failed to initialize database', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

const createDefaultAdmin = async () => {
  try {
    const userRepo = getUserRepository();
    const preferencesRepo = getUserPreferencesRepository();

    // Verificar se já existe um usuário admin
    const existingAdmin = await userRepo.findOne({
      where: [
        { username: 'admin' },
        { email: 'admin@sistema.com' }
      ]
    });

    if (existingAdmin) {
      console.log('ℹ️  Usuário administrador já existe');
      logger.info('Admin user already exists', { userId: existingAdmin.id });
      return;
    }

    // Criar hash da senha padrão
    const defaultPassword = 'admin123';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    // Criar usuário administrador usando TypeORM
    const admin = userRepo.create({
      firstName: 'Administrador',
      lastName: 'Sistema',
      username: 'admin',
      email: 'admin@sistema.com',
      passwordHash,
      role: 'admin',
      emailVerified: true,
      status: 'active',
      termsAcceptedAt: new Date(),
      privacyPolicyAcceptedAt: new Date()
    });

    const savedAdmin = await userRepo.save(admin);

    // Criar preferências padrão para o admin usando TypeORM
    const preferences = preferencesRepo.create({
      userId: savedAdmin.id,
      themeMode: 'system',
      themeColor: 'blue',
      fontSize: 'medium',
      compactMode: false,
      animationsEnabled: true,
      highContrast: false,
      reduceMotion: false
    });

    await preferencesRepo.save(preferences);

    console.log('\n✅ Usuário administrador criado com sucesso!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  📧 Email: admin@sistema.com');
    console.log('  👤 Username: admin');
    console.log('  🔑 Senha: admin123');
    console.log('  🛡️  Role: admin');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⚠️  IMPORTANTE: Altere a senha após o primeiro login!\n');

    logger.info('Admin user created successfully', {
      userId: savedAdmin.id,
      username: savedAdmin.username,
      email: savedAdmin.email
    });

  } catch (error) {
    console.error('❌ Erro ao criar usuário administrador:', error);
    logger.error('Failed to create admin user', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

module.exports = { createTables };
