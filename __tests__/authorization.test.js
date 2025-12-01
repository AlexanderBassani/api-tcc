const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/database');
const bcrypt = require('bcrypt');
const { generateTestUsername, generateTestEmail } = require('./helpers/testUtils');

describe('Authorization Middleware', () => {
  let adminToken;
  let userToken;
  let adminUserId;
  let regularUserId;
  let targetUserId;

  beforeAll(async () => {
    const hashedPassword = await bcrypt.hash('testpass123', 10);

    // Criar usuário admin
    const adminResult = await pool.query(
      `INSERT INTO users (first_name, last_name, username, email, password_hash, role, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id`,
      ['Admin', 'User', 'admin_auth_test', 'admin.auth@test.com', hashedPassword, 'admin', 'active']
    );
    adminUserId = adminResult.rows[0].id;

    // Criar usuário regular
    const userResult = await pool.query(
      `INSERT INTO users (first_name, last_name, username, email, password_hash, role, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id`,
      ['Regular', 'User', 'user_auth_test', 'user.auth@test.com', hashedPassword, 'user', 'active']
    );
    regularUserId = userResult.rows[0].id;

    // Criar usuário alvo para testes de deleção/inativação
    const targetResult = await pool.query(
      `INSERT INTO users (first_name, last_name, username, email, password_hash, role, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id`,
      ['Target', 'User', 'target_auth_test', 'target.auth@test.com', hashedPassword, 'user', 'active']
    );
    targetUserId = targetResult.rows[0].id;

    // Fazer login como admin
    const adminLogin = await request(app)
      .post('/api/users/login')
      .send({
        login: 'admin_auth_test',
        password: 'testpass123'
      });
    adminToken = adminLogin.body.token;

    // Fazer login como usuário regular
    const userLogin = await request(app)
      .post('/api/users/login')
      .send({
        login: 'user_auth_test',
        password: 'testpass123'
      });
    userToken = userLogin.body.token;
  });

  afterAll(async () => {
    // Limpar dados de teste
    await pool.query('DELETE FROM users WHERE id IN ($1, $2, $3)', [adminUserId, regularUserId, targetUserId]);
  });

  describe('POST /api/users (Create User - Admin Only)', () => {
    test('Should allow admin to create user', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          first_name: 'New',
          last_name: 'User',
          username: 'newuser_auth_test',
          email: 'newuser.auth@test.com',
          password: 'password123',
          role: 'user'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'Usuário criado com sucesso');
      expect(response.body.data.username).toBe('newuser_auth_test');

      // Limpar
      await pool.query('DELETE FROM users WHERE username = $1', ['newuser_auth_test']);
    });

    test('Should deny regular user from creating user', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          first_name: 'New',
          last_name: 'User',
          username: 'newuser2_auth_test',
          email: 'newuser2.auth@test.com',
          password: 'password123',
          role: 'user'
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'Acesso negado');
      expect(response.body).toHaveProperty('required_roles');
      expect(response.body.required_roles).toContain('admin');
      expect(response.body).toHaveProperty('user_role', 'user');
    });

    test('Should deny unauthenticated request', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({
          first_name: 'New',
          last_name: 'User',
          username: 'newuser3_auth_test',
          email: 'newuser3.auth@test.com',
          password: 'password123',
          role: 'user'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PATCH /api/users/:id/deactivate (Admin Only)', () => {
    test('Should allow admin to deactivate user', async () => {
      // Criar usuário para inativar
      const hashedPassword = await bcrypt.hash('testpass123', 10);

      const testUsername = generateTestUsername('deact_auth');
      const testEmail = generateTestEmail('deact.auth');

      const userResult = await pool.query(
        `INSERT INTO users (first_name, last_name, username, email, password_hash, role, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id`,
        ['Deactivate', 'Test', testUsername, testEmail, hashedPassword, 'user', 'active']
      );
      const userId = userResult.rows[0].id;

      const response = await request(app)
        .patch(`/api/users/${userId}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Usuário inativado com sucesso');
      expect(response.body.data.status).toBe('inactive');

      // Limpar
      await pool.query('DELETE FROM users WHERE username = $1', [testUsername]);
    });

    test('Should deny regular user from deactivating user', async () => {
      const response = await request(app)
        .patch(`/api/users/${targetUserId}/deactivate`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'Acesso negado');
      expect(response.body).toHaveProperty('required_roles');
      expect(response.body.required_roles).toContain('admin');
    });

    test('Should deny unauthenticated request', async () => {
      const response = await request(app)
        .patch(`/api/users/${targetUserId}/deactivate`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/users/:id (Admin Only)', () => {
    test('Should allow admin to delete user', async () => {
      // Criar usuário para deletar
      const hashedPassword = await bcrypt.hash('testpass123', 10);

      const testUsername = generateTestUsername('del_auth');
      const testEmail = generateTestEmail('del.auth');

      const userResult = await pool.query(
        `INSERT INTO users (first_name, last_name, username, email, password_hash, role, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id`,
        ['Delete', 'Test', testUsername, testEmail, hashedPassword, 'user', 'active']
      );
      const userId = userResult.rows[0].id;

      const response = await request(app)
        .delete(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Usuário removido com sucesso (soft delete)');
      expect(response.body.deleteType).toBe('soft');

      // Limpar
      await pool.query('DELETE FROM users WHERE username = $1', [testUsername]);
    });

    test('Should deny regular user from deleting user', async () => {
      const response = await request(app)
        .delete(`/api/users/${targetUserId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'Acesso negado');
      expect(response.body).toHaveProperty('required_roles');
      expect(response.body.required_roles).toContain('admin');
    });

    test('Should deny unauthenticated request', async () => {
      const response = await request(app)
        .delete(`/api/users/${targetUserId}`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    test('Should allow admin to hard delete user', async () => {
      // Criar usuário para deletar
      const hashedPassword = await bcrypt.hash('testpass123', 10);

      const testUsername = generateTestUsername('hdel_auth');
      const testEmail = generateTestEmail('hdel.auth');

      const userResult = await pool.query(
        `INSERT INTO users (first_name, last_name, username, email, password_hash, role, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id`,
        ['HardDelete', 'Test', testUsername, testEmail, hashedPassword, 'user', 'active']
      );
      const userId = userResult.rows[0].id;

      const response = await request(app)
        .delete(`/api/users/${userId}?hardDelete=true`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Usuário removido permanentemente com sucesso');
      expect(response.body.deleteType).toBe('hard');

      // Verificar se foi removido
      const checkResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
      expect(checkResult.rows.length).toBe(0);
    });
  });

  describe('Authorization Error Messages', () => {
    test('Should return detailed error message for forbidden access', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          first_name: 'Test',
          last_name: 'User',
          username: 'testuser',
          email: 'test@test.com',
          password: 'password123'
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'Acesso negado');
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('admin');
      expect(response.body).toHaveProperty('required_roles');
      expect(response.body).toHaveProperty('user_role');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('path');
    });
  });
});
