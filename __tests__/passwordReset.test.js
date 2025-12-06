const request = require('supertest');
const app = require('../src/app');
const { AppDataSource } = require('../src/config/typeorm');
const { hashToken } = require('../src/utils/tokenGenerator');

// Repositories
let usersRepository;

// Inicializar repositories quando o Data Source estiver pronto
const getRepositories = () => {
  if (!AppDataSource.isInitialized) {
    throw new Error('Database not initialized. Please ensure TypeORM is initialized before accessing repositories.');
  }
  if (!usersRepository) {
    usersRepository = AppDataSource.getRepository('User');
  }
  return { usersRepository };
};

describe('Password Reset API', () => {
  let testUserId;

  beforeAll(async () => {
    const { usersRepository } = getRepositories();

    // Limpar usuário de teste anterior se existir
    await usersRepository.delete({ email: 'test.reset@test.com' });

    // Criar usuário de teste
    const testUser = usersRepository.create({
      first_name: 'Test',
      last_name: 'User',
      username: 'testuser_reset',
      email: 'test.reset@test.com',
      password_hash: 'hashedpassword',
      status: 'active'
    });
    const savedUser = await usersRepository.save(testUser);
    testUserId = savedUser.id;
  });

  afterAll(async () => {
    // Limpar dados de teste
    const { usersRepository } = getRepositories();
    await usersRepository.delete({ id: testUserId });
  });

  describe('Complete Password Reset Flow', () => {
    test('Should complete full password reset flow: request -> validate -> reset', async () => {
      const { usersRepository } = getRepositories();

      // Limpar qualquer token de reset anterior
      await usersRepository.update(
        { id: testUserId },
        { password_reset_token: null, password_reset_expires: null }
      );

      // 1. Solicitar reset de senha
      const requestResponse = await request(app)
        .post('/api/password-reset/request')
        .send({ email: 'test.reset@test.com' });

      expect(requestResponse.status).toBe(200);
      expect(requestResponse.body).toHaveProperty('message');
      expect(requestResponse.body.message).toContain('instruções para redefinir sua senha');

      // Extrair token do debug (disponível em desenvolvimento)
      expect(requestResponse.body).toHaveProperty('debug');
      const token = requestResponse.body.debug.token;
      expect(token).toBeTruthy();

      // 2. Validar token
      const validateResponse = await request(app)
        .post('/api/password-reset/validate-token')
        .send({ token });

      expect(validateResponse.status).toBe(200);
      expect(validateResponse.body).toHaveProperty('message', 'Token válido');
      expect(validateResponse.body).toHaveProperty('email', 'test.reset@test.com');

      // 3. Redefinir senha
      const resetResponse = await request(app)
        .post('/api/password-reset/reset')
        .send({
          token,
          newPassword: 'NewSecurePassword123!'
        });

      expect(resetResponse.status).toBe(200);
      expect(resetResponse.body).toHaveProperty('message');
      expect(resetResponse.body.message).toContain('Senha redefinida com sucesso');

      // Verificar se token foi removido do banco
      const userCheck = await usersRepository.findOne({
        where: { id: testUserId }
      });
      expect(userCheck.password_reset_token).toBeNull();
      expect(userCheck.password_reset_expires).toBeNull();
    }, 15000); // Timeout de 15s para operações de email
  });

  describe('Token Security', () => {
    test('Should not accept reused token', async () => {
      const { usersRepository } = getRepositories();

      // Criar token válido único
      const token = 'one-time-token-' + Date.now();
      const hashedToken = hashToken(token);
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

      // Atualizar usuário com token de reset
      await usersRepository.update(
        { id: testUserId },
        { password_reset_token: hashedToken, password_reset_expires: expiresAt }
      );

      // Primeiro uso - deve funcionar
      const firstResponse = await request(app)
        .post('/api/password-reset/reset')
        .send({
          token: token,
          newPassword: 'FirstPassword123!'
        });

      expect(firstResponse.status).toBe(200);

      // Segundo uso do mesmo token - deve falhar (token foi removido)
      const secondResponse = await request(app)
        .post('/api/password-reset/reset')
        .send({
          token: token,
          newPassword: 'SecondPassword123!'
        });

      expect(secondResponse.status).toBe(400);
      expect(secondResponse.body.error).toContain('inválido ou expirado');
    });
  });
});


