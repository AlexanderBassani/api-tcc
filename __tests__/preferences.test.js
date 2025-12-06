const request = require('supertest');
const app = require('../src/app');
const { AppDataSource } = require('../src/config/typeorm');
const { generateTestUsername, generateTestEmail } = require('./helpers/testUtils');

// Repositories
let usersRepository;
let preferencesRepository;

// Inicializar repositories quando o Data Source estiver pronto
const getRepositories = () => {
  if (!AppDataSource.isInitialized) {
    throw new Error('Database not initialized. Please ensure TypeORM is initialized before accessing repositories.');
  }
  if (!usersRepository) {
    usersRepository = AppDataSource.getRepository('User');
  }
  if (!preferencesRepository) {
    preferencesRepository = AppDataSource.getRepository('UserPreference');
  }
  return { usersRepository, preferencesRepository };
};

describe('Preferences API', () => {
  let authToken;
  let testUserId;
  let testUsername;
  let testEmail;

  beforeAll(async () => {
    // Gerar dados únicos para o usuário de teste
    testUsername = generateTestUsername('prefs_test');
    testEmail = generateTestEmail('prefs.test');

    // Criar usuário de teste via registro para criar preferências automaticamente
    const registerResponse = await request(app)
      .post('/api/users/register')
      .send({
        first_name: 'Preferences',
        last_name: 'Test',
        username: testUsername,
        email: testEmail,
        password: 'testpass123'
      });

    testUserId = registerResponse.body.user.id;

    // Fazer login para obter token
    const loginResponse = await request(app)
      .post('/api/users/login')
      .send({
        login: testUsername,
        password: 'testpass123'
      });

    authToken = loginResponse.body.token;
  });

  afterAll(async () => {
    // Limpar dados de teste
    const { usersRepository } = getRepositories();
    await usersRepository.delete({ id: testUserId });
  });

  afterEach(async () => {
    // Resetar preferências para valores padrão após cada teste
    const { preferencesRepository } = getRepositories();
    const preference = await preferencesRepository.findOne({ where: { user_id: testUserId } });

    if (preference) {
      preference.theme_mode = 'system';
      preference.theme_color = 'blue';
      preference.font_size = 'medium';
      preference.compact_mode = false;
      preference.animations_enabled = true;
      preference.high_contrast = false;
      preference.reduce_motion = false;
      await preferencesRepository.save(preference);
    }
  });

  describe('GET /api/preferences', () => {
    test('Should return default preferences for new user', async () => {
      const response = await request(app)
        .get('/api/preferences')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('theme_mode', 'system');
      expect(response.body).toHaveProperty('theme_color', 'blue');
      expect(response.body).toHaveProperty('font_size', 'medium');
      expect(response.body).toHaveProperty('compact_mode', false);
      expect(response.body).toHaveProperty('animations_enabled', true);
      expect(response.body).toHaveProperty('high_contrast', false);
      expect(response.body).toHaveProperty('reduce_motion', false);
      expect(response.body).toHaveProperty('user_id', testUserId);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('created_at');
    });

    test('Should return updated preferences when they exist', async () => {
      // Atualizar preferências
      const { preferencesRepository } = getRepositories();
      const preference = await preferencesRepository.findOne({ where: { user_id: testUserId } });

      if (preference) {
        preference.theme_mode = 'dark';
        preference.theme_color = 'purple';
        preference.font_size = 'large';
        await preferencesRepository.save(preference);
      }

      const response = await request(app)
        .get('/api/preferences')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('theme_mode', 'dark');
      expect(response.body).toHaveProperty('theme_color', 'purple');
      expect(response.body).toHaveProperty('font_size', 'large');
      expect(response.body).toHaveProperty('user_id', testUserId);
    });

    test('Should fail without authentication token', async () => {
      const response = await request(app)
        .get('/api/preferences');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    test('Should fail with invalid token', async () => {
      const response = await request(app)
        .get('/api/preferences')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/preferences', () => {
    test('Should create new preferences successfully', async () => {
      const response = await request(app)
        .put('/api/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          theme_mode: 'dark',
          theme_color: 'purple',
          font_size: 'large',
          compact_mode: true,
          animations_enabled: false,
          high_contrast: true,
          reduce_motion: true
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Preferências atualizadas com sucesso');
      expect(response.body).toHaveProperty('preferences');
      expect(response.body.preferences.theme_mode).toBe('dark');
      expect(response.body.preferences.theme_color).toBe('purple');
      expect(response.body.preferences.font_size).toBe('large');
      expect(response.body.preferences.compact_mode).toBe(true);
      expect(response.body.preferences.animations_enabled).toBe(false);
      expect(response.body.preferences.high_contrast).toBe(true);
      expect(response.body.preferences.reduce_motion).toBe(true);
    });

    test('Should update existing preferences successfully', async () => {
      // Preferências já existem (criadas no beforeAll), apenas testar atualização
      const response = await request(app)
        .put('/api/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          theme_mode: 'dark',
          theme_color: 'red'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Preferências atualizadas com sucesso');
      expect(response.body.preferences.theme_mode).toBe('dark');
      expect(response.body.preferences.theme_color).toBe('red');
    });

    test('Should update only provided fields', async () => {
      // Preferências já existem com valores padrão
      const response = await request(app)
        .put('/api/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          theme_mode: 'dark'
        });

      expect(response.status).toBe(200);
      expect(response.body.preferences.theme_mode).toBe('dark');
      expect(response.body.preferences.theme_color).toBe('blue'); // Não alterado
      expect(response.body.preferences.font_size).toBe('medium'); // Não alterado
    });

    test('Should fail with invalid theme_mode', async () => {
      const response = await request(app)
        .put('/api/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          theme_mode: 'invalid'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Validação falhou');
      expect(response.body.message).toContain('theme_mode');
    });

    test('Should fail with invalid font_size', async () => {
      const response = await request(app)
        .put('/api/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          font_size: 'huge'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Validação falhou');
      expect(response.body.message).toContain('font_size');
    });

    test('Should fail when updating without any fields', async () => {
      // Preferências já existem
      const response = await request(app)
        .put('/api/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Validação falhou');
      expect(response.body.message).toContain('Nenhum campo para atualizar');
    });

    test('Should fail without authentication token', async () => {
      const response = await request(app)
        .put('/api/preferences')
        .send({
          theme_mode: 'dark'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/preferences', () => {
    test('Should reset preferences successfully', async () => {
      // Atualizar preferências para algo diferente do padrão
      const { preferencesRepository } = getRepositories();
      const preference = await preferencesRepository.findOne({ where: { user_id: testUserId } });

      if (preference) {
        preference.theme_mode = 'dark';
        preference.theme_color = 'purple';
        await preferencesRepository.save(preference);
      }

      const response = await request(app)
        .delete('/api/preferences')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Preferências resetadas para valores padrão com sucesso');

      // Verificar se foi deletado
      const checkPreference = await preferencesRepository.findOne({ where: { user_id: testUserId } });
      expect(checkPreference).toBeNull();
    });

    test('Should fail without authentication token', async () => {
      const response = await request(app)
        .delete('/api/preferences');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PATCH /api/preferences/theme', () => {
    test('Should update theme mode successfully', async () => {
      const response = await request(app)
        .patch('/api/preferences/theme')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          theme_mode: 'dark'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Tema atualizado com sucesso');
      expect(response.body.preferences.theme_mode).toBe('dark');
    });

    test('Should update theme color successfully', async () => {
      const response = await request(app)
        .patch('/api/preferences/theme')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          theme_color: 'purple'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Tema atualizado com sucesso');
      expect(response.body.preferences.theme_color).toBe('purple');
    });

    test('Should update both theme mode and color', async () => {
      const response = await request(app)
        .patch('/api/preferences/theme')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          theme_mode: 'dark',
          theme_color: 'green'
        });

      expect(response.status).toBe(200);
      expect(response.body.preferences.theme_mode).toBe('dark');
      expect(response.body.preferences.theme_color).toBe('green');
    });

    test('Should update theme on existing preferences', async () => {
      // Preferências já existem, apenas atualizar
      const response = await request(app)
        .patch('/api/preferences/theme')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          theme_mode: 'dark'
        });

      expect(response.status).toBe(200);
      expect(response.body.preferences.theme_mode).toBe('dark');
      expect(response.body.preferences.theme_color).toBe('blue'); // Não alterado
      expect(response.body.preferences.font_size).toBe('medium'); // Valor padrão
    });

    test('Should fail with invalid theme_mode', async () => {
      const response = await request(app)
        .patch('/api/preferences/theme')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          theme_mode: 'rainbow'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Validação falhou');
      expect(response.body.message).toContain('theme_mode');
    });

    test('Should fail without any theme fields', async () => {
      const response = await request(app)
        .patch('/api/preferences/theme')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Validação falhou');
      expect(response.body.message).toContain('theme_mode ou theme_color');
    });

    test('Should fail without authentication token', async () => {
      const response = await request(app)
        .patch('/api/preferences/theme')
        .send({
          theme_mode: 'dark'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Theme modes validation', () => {
    test('Should accept "light" theme mode', async () => {
      const response = await request(app)
        .patch('/api/preferences/theme')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ theme_mode: 'light' });

      expect(response.status).toBe(200);
      expect(response.body.preferences.theme_mode).toBe('light');
    });

    test('Should accept "dark" theme mode', async () => {
      const response = await request(app)
        .patch('/api/preferences/theme')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ theme_mode: 'dark' });

      expect(response.status).toBe(200);
      expect(response.body.preferences.theme_mode).toBe('dark');
    });

    test('Should accept "system" theme mode', async () => {
      const response = await request(app)
        .patch('/api/preferences/theme')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ theme_mode: 'system' });

      expect(response.status).toBe(200);
      expect(response.body.preferences.theme_mode).toBe('system');
    });
  });

  describe('Font size validation', () => {
    test('Should accept all valid font sizes', async () => {
      const validSizes = ['small', 'medium', 'large', 'extra-large'];

      for (const size of validSizes) {
        const response = await request(app)
          .put('/api/preferences')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ font_size: size });

        expect(response.status).toBe(200);
        expect(response.body.preferences.font_size).toBe(size);
      }
    });
  });

  describe('Boolean preferences', () => {
    test('Should handle all boolean preferences correctly', async () => {
      const response = await request(app)
        .put('/api/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          compact_mode: true,
          animations_enabled: false,
          high_contrast: true,
          reduce_motion: true
        });

      expect(response.status).toBe(200);
      expect(response.body.preferences.compact_mode).toBe(true);
      expect(response.body.preferences.animations_enabled).toBe(false);
      expect(response.body.preferences.high_contrast).toBe(true);
      expect(response.body.preferences.reduce_motion).toBe(true);
    });
  });
});


