const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/database');
const { hashToken } = require('../src/utils/tokenGenerator');

describe('Password Reset API', () => {
  let testUserId;

  beforeAll(async () => {
    // Limpar usuário de teste anterior se existir
    await pool.query('DELETE FROM users WHERE email = $1', ['test.reset@test.com']);

    // Criar usuário de teste
    const result = await pool.query(
      `INSERT INTO users (first_name, last_name, username, email, password_hash, status)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id`,
      ['Test', 'User', 'testuser_reset', 'test.reset@test.com', 'hashedpassword', 'active']
    );
    testUserId = result.rows[0].id;
  });

  afterAll(async () => {
    // Limpar dados de teste
    await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
    await pool.end();
  });

  describe('Complete Password Reset Flow', () => {
    test('Should complete full password reset flow: request -> validate -> reset', async () => {
      // Limpar qualquer token de reset anterior
      await pool.query(
        'UPDATE users SET password_reset_token = NULL, password_reset_expires = NULL WHERE id = $1',
        [testUserId]
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
      const userCheck = await pool.query(
        'SELECT password_reset_token, password_reset_expires FROM users WHERE id = $1',
        [testUserId]
      );
      expect(userCheck.rows[0].password_reset_token).toBeNull();
      expect(userCheck.rows[0].password_reset_expires).toBeNull();
    }, 15000); // Timeout de 15s para operações de email
  });

  describe('Token Security', () => {
    test('Should not accept reused token', async () => {
      // Criar token válido único
      const token = 'one-time-token-' + Date.now();
      const hashedToken = hashToken(token);
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

      // Convert to ISO string to avoid timezone issues
      await pool.query(
        'UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3',
        [hashedToken, expiresAt.toISOString(), testUserId]
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
