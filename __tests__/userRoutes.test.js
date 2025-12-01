const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/database');
const { generateTestUsername, generateTestEmail } = require('./helpers/testUtils');

describe('User Routes API', () => {
  let authToken;
  let testUserId;
  let adminToken;
  let adminUserId;
  let testUsername;
  let testEmail;
  let adminUsername;
  let adminEmail;

  beforeAll(async () => {
    // Gerar dados únicos para os usuários de teste
    testUsername = generateTestUsername('testuser_routes');
    testEmail = generateTestEmail('test.routes');
    adminUsername = generateTestUsername('adminuser_test');
    adminEmail = generateTestEmail('admin.test');

    // Criar usuário de teste comum
    const userResult = await pool.query(
      `INSERT INTO users (first_name, last_name, username, email, password_hash, role, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id`,
      ['Test', 'User', testUsername, testEmail, '$2b$10$abcdefghijklmnopqrstuvwxyz', 'user', 'active']
    );
    testUserId = userResult.rows[0].id;

    // Criar usuário admin
    const adminResult = await pool.query(
      `INSERT INTO users (first_name, last_name, username, email, password_hash, role, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id`,
      ['Admin', 'Test', adminUsername, adminEmail, '$2b$10$abcdefghijklmnopqrstuvwxyz', 'admin', 'active']
    );
    adminUserId = adminResult.rows[0].id;
  });

  afterAll(async () => {
    // Limpar dados de teste
    await pool.query('DELETE FROM users WHERE id IN ($1, $2)', [testUserId, adminUserId]);
  });

  describe('POST /api/users/register', () => {
    test('Should register new user successfully', async () => {
      const testUsername = generateTestUsername('johndoe_reg');
      const testEmail = generateTestEmail('john.reg');
      
      const response = await request(app)
        .post('/api/users/register')
        .send({
          first_name: 'John',
          last_name: 'Doe',
          username: testUsername,
          email: testEmail,
          password: 'password123',
          phone: '+5511999999999',
          date_of_birth: '1990-01-01',
          gender: 'male'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'Usuário cadastrado com sucesso');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user.username).toBe(testUsername);

      // Limpar
      await pool.query('DELETE FROM users WHERE username = $1', [testUsername]);
    });

    test('Should fail with missing required fields', async () => {
      const response = await request(app)
        .post('/api/users/register')
        .send({
          first_name: 'John'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('obrigatórios');
    });

    test('Should fail with invalid email format', async () => {
      const response = await request(app)
        .post('/api/users/register')
        .send({
          first_name: 'John',
          last_name: 'Doe',
          username: 'johndoe2',
          email: 'invalid-email',
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Email inválido');
    });

    test('Should fail with short password', async () => {
      const response = await request(app)
        .post('/api/users/register')
        .send({
          first_name: 'John',
          last_name: 'Doe',
          username: 'johndoe3',
          email: 'john3@test.com',
          password: '123'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toContain('6 caracteres');
    });

    test('Should fail with duplicate username', async () => {
      const response = await request(app)
        .post('/api/users/register')
        .send({
          first_name: 'Test',
          last_name: 'User',
          username: testUsername,
          email: 'new@test.com',
          password: 'password123'
        });

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toContain('já estão em uso');
    });
  });

  describe('POST /api/users/login', () => {
    beforeAll(async () => {
      // Criar usuário com senha conhecida
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('testpass123', 10);

      await pool.query(
        `INSERT INTO users (first_name, last_name, username, email, password_hash, role, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (username) DO NOTHING`,
        ['Login', 'Test', 'loginuser_test', 'login.test@test.com', hashedPassword, 'user', 'active']
      );
    });

    test('Should login with valid credentials (username)', async () => {
      const response = await request(app)
        .post('/api/users/login')
        .send({
          login: 'loginuser_test',
          password: 'testpass123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Login realizado com sucesso');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('refreshToken');

      authToken = response.body.token;
    });

    test('Should login with valid credentials (email)', async () => {
      const response = await request(app)
        .post('/api/users/login')
        .send({
          login: 'login.test@test.com',
          password: 'testpass123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
    });

    test('Should fail with wrong password', async () => {
      const response = await request(app)
        .post('/api/users/login')
        .send({
          login: 'loginuser_test',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Credenciais inválidas');
    });

    test('Should fail with non-existent user', async () => {
      const response = await request(app)
        .post('/api/users/login')
        .send({
          login: 'nonexistent',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    test('Should fail without credentials', async () => {
      const response = await request(app)
        .post('/api/users/login')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('obrigatórios');
    });

    afterAll(async () => {
      await pool.query('DELETE FROM users WHERE username = $1', ['loginuser_test']);
    });
  });

  describe('GET /api/users (Protected)', () => {
    test('Should get all users with valid token', async () => {
      // Primeiro fazer login
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('testpass123', 10);

      await pool.query(
        `INSERT INTO users (first_name, last_name, username, email, password_hash, role, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (username) DO NOTHING`,
        ['Auth', 'Test', 'authuser_test', 'auth.test@test.com', hashedPassword, 'user', 'active']
      );

      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          login: 'authuser_test',
          password: 'testpass123'
        });

      const token = loginResponse.body.token;

      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);

      // Limpar
      await pool.query('DELETE FROM users WHERE username = $1', ['authuser_test']);
    });

    test('Should fail without token', async () => {
      const response = await request(app)
        .get('/api/users');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Token');
    });

    test('Should fail with invalid token', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/users/:id (Protected)', () => {
    test('Should get user by ID with valid token', async () => {
      // Fazer login
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('testpass123', 10);

      const testUsername = generateTestUsername('getbyid');
      const testEmail = generateTestEmail('getbyid.test');

      const userResult = await pool.query(
        `INSERT INTO users (first_name, last_name, username, email, password_hash, role, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id`,
        ['GetById', 'Test', testUsername, testEmail, hashedPassword, 'user', 'active']
      );

      const userId = userResult.rows[0].id;

      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          login: testUsername,
          password: 'testpass123'
        });

      const token = loginResponse.body.token;

      const response = await request(app)
        .get(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data.id).toBe(userId);
      expect(response.body.data.username).toBe(testUsername);

      // Limpar
      await pool.query('DELETE FROM users WHERE username = $1', [testUsername]);
    });

    test('Should fail with invalid ID format', async () => {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('testpass123', 10);

      const testUsername = generateTestUsername('invalid');
      const testEmail = generateTestEmail('invalid.test');

      await pool.query(
        `INSERT INTO users (first_name, last_name, username, email, password_hash, role, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        ['Invalid', 'Test', testUsername, testEmail, hashedPassword, 'user', 'active']
      );

      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          login: testUsername,
          password: 'testpass123'
        });

      const token = loginResponse.body.token;

      const response = await request(app)
        .get('/api/users/abc')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');

      // Limpar
      await pool.query('DELETE FROM users WHERE username = $1', [testUsername]);
    });
  });

  describe('GET /api/users/profile (Protected)', () => {
    test('Should get own profile with valid token', async () => {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('testpass123', 10);

      const testUsername = generateTestUsername('profile');
      const testEmail = generateTestEmail('profile.test');

      await pool.query(
        `INSERT INTO users (first_name, last_name, username, email, password_hash, role, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        ['Profile', 'Test', testUsername, testEmail, hashedPassword, 'user', 'active']
      );

      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          login: testUsername,
          password: 'testpass123'
        });

      const token = loginResponse.body.token;

      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('username', testUsername);
      expect(response.body).toHaveProperty('email', testEmail);
      expect(response.body).not.toHaveProperty('password_hash');

      // Limpar
      await pool.query('DELETE FROM users WHERE username = $1', [testUsername]);
    });
  });

  describe('PUT /api/users/profile (Protected)', () => {
    test('Should update own profile', async () => {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('testpass123', 10);

      const testUsername = generateTestUsername('update');
      const testEmail = generateTestEmail('update.test');

      await pool.query(
        `INSERT INTO users (first_name, last_name, username, email, password_hash, role, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        ['Update', 'Test', testUsername, testEmail, hashedPassword, 'user', 'active']
      );

      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          login: testUsername,
          password: 'testpass123'
        });

      const token = loginResponse.body.token;

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          first_name: 'Updated',
          bio: 'Test bio'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body.user.first_name).toBe('Updated');

      // Limpar
      await pool.query('DELETE FROM users WHERE username = $1', [testUsername]);
    });
  });

  describe('PUT /api/users/change-password (Protected)', () => {
    test('Should change password with current password', async () => {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('oldpass123', 10);

      const testUsername = generateTestUsername('chpass');
      const testEmail = generateTestEmail('chpass.test');

      await pool.query(
        `INSERT INTO users (first_name, last_name, username, email, password_hash, role, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        ['Change', 'Pass', testUsername, testEmail, hashedPassword, 'user', 'active']
      );

      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          login: testUsername,
          password: 'oldpass123'
        });

      const token = loginResponse.body.token;

      const response = await request(app)
        .put('/api/users/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'oldpass123',
          newPassword: 'newpass123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Senha alterada com sucesso');

      // Limpar
      await pool.query('DELETE FROM users WHERE username = $1', [testUsername]);
    });

    test('Should fail with wrong current password', async () => {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('correctpass', 10);

      const testUsername = generateTestUsername('wrpass');
      const testEmail = generateTestEmail('wrpass.test');

      await pool.query(
        `INSERT INTO users (first_name, last_name, username, email, password_hash, role, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        ['Wrong', 'Pass', testUsername, testEmail, hashedPassword, 'user', 'active']
      );

      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          login: testUsername,
          password: 'correctpass'
        });

      const token = loginResponse.body.token;

      const response = await request(app)
        .put('/api/users/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'newpass123'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('incorreta');

      // Limpar
      await pool.query('DELETE FROM users WHERE username = $1', [testUsername]);
    });
  });

  describe('POST /api/users/refresh-token', () => {
    test('Should refresh token with valid refresh token', async () => {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('testpass123', 10);

      const testUsername = generateTestUsername('refresh');
      const testEmail = generateTestEmail('refresh.test');

      await pool.query(
        `INSERT INTO users (first_name, last_name, username, email, password_hash, role, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        ['Refresh', 'Test', testUsername, testEmail, hashedPassword, 'user', 'active']
      );

      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          login: testUsername,
          password: 'testpass123'
        });

      const refreshToken = loginResponse.body.refreshToken;

      const response = await request(app)
        .post('/api/users/refresh-token')
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('refreshToken');

      // Limpar
      await pool.query('DELETE FROM users WHERE username = $1', [testUsername]);
    });

    test('Should fail without refresh token', async () => {
      const response = await request(app)
        .post('/api/users/refresh-token')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/users/logout (Protected)', () => {
    test('Should logout successfully with valid token', async () => {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('testpass123', 10);

      const testUsername = generateTestUsername('logout');
      const testEmail = generateTestEmail('logout.test');

      await pool.query(
        `INSERT INTO users (first_name, last_name, username, email, password_hash, role, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        ['Logout', 'Test', testUsername, testEmail, hashedPassword, 'user', 'active']
      );

      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          login: testUsername,
          password: 'testpass123'
        });

      const token = loginResponse.body.token;

      const response = await request(app)
        .post('/api/users/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Logout realizado com sucesso');

      // Limpar
      await pool.query('DELETE FROM users WHERE username = $1', [testUsername]);
    });

    test('Should fail logout without token', async () => {
      const response = await request(app)
        .post('/api/users/logout');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Token');
    });

    test('Should fail logout with invalid token', async () => {
      const response = await request(app)
        .post('/api/users/logout')
        .set('Authorization', 'Bearer invalid-token-xyz');

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PATCH /api/users/:id/deactivate (Protected)', () => {
    test('Should deactivate user successfully with admin', async () => {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('testpass123', 10);

      const testUsername = generateTestUsername('deact');
      const testEmail = generateTestEmail('deact.test');
      const adminUsername = generateTestUsername('admin_deact');
      const adminEmail = generateTestEmail('admin.deact');

      // Criar usuário para deativar
      const userResult = await pool.query(
        `INSERT INTO users (first_name, last_name, username, email, password_hash, role, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id`,
        ['Deactivate', 'Test', testUsername, testEmail, hashedPassword, 'user', 'active']
      );

      const userId = userResult.rows[0].id;

      // Criar admin para obter token
      await pool.query(
        `INSERT INTO users (first_name, last_name, username, email, password_hash, role, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id`,
        ['Admin', 'Deactivate', adminUsername, adminEmail, hashedPassword, 'admin', 'active']
      );

      // Fazer login como admin para obter token
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          login: adminUsername,
          password: 'testpass123'
        });

      const token = loginResponse.body.token;

      // Deativar o usuário
      const response = await request(app)
        .patch(`/api/users/${userId}/deactivate`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Usuário inativado com sucesso');
      expect(response.body.data.status).toBe('inactive');
      expect(response.body.data.id).toBe(userId);

      // Limpar
      await pool.query('DELETE FROM users WHERE username = $1 OR username = $2', [testUsername, adminUsername]);
    });

    test('Should fail to deactivate already inactive user', async () => {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('testpass123', 10);

      const testUsername = generateTestUsername('inactive');
      const testEmail = generateTestEmail('inactive.t');
      const adminUsername = generateTestUsername('admin_deact2');
      const adminEmail = generateTestEmail('admin.deact2');

      // Criar usuário inativo
      const userResult = await pool.query(
        `INSERT INTO users (first_name, last_name, username, email, password_hash, role, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id`,
        ['Already', 'Inactive', testUsername, testEmail, hashedPassword, 'user', 'inactive']
      );

      const userId = userResult.rows[0].id;

      // Criar admin para obter token
      await pool.query(
        `INSERT INTO users (first_name, last_name, username, email, password_hash, role, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id`,
        ['Auth', 'Admin', adminUsername, adminEmail, hashedPassword, 'admin', 'active']
      );

      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          login: adminUsername,
          password: 'testpass123'
        });

      const token = loginResponse.body.token;

      const response = await request(app)
        .patch(`/api/users/${userId}/deactivate`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Usuário já está inativo');

      // Limpar
      await pool.query('DELETE FROM users WHERE username = $1 OR username = $2', [testUsername, adminUsername]);
    });

    test('Should fail to deactivate non-existent user', async () => {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('testpass123', 10);

      await pool.query(
        `INSERT INTO users (first_name, last_name, username, email, password_hash, role, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (username) DO NOTHING`,
        ['Auth2', 'Admin', 'auth_deactivate2', 'auth.deactivate2@test.com', hashedPassword, 'admin', 'active']
      );

      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          login: 'auth_deactivate2',
          password: 'testpass123'
        });

      const token = loginResponse.body.token;

      const response = await request(app)
        .patch('/api/users/999999/deactivate')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Usuário não encontrado');

      // Limpar
      await pool.query('DELETE FROM users WHERE username = $1', ['auth_deactivate2']);
    });

    test('Should fail to deactivate with invalid ID', async () => {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('testpass123', 10);

      await pool.query(
        `INSERT INTO users (first_name, last_name, username, email, password_hash, role, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (username) DO NOTHING`,
        ['Auth3', 'Admin', 'auth_deactivate3', 'auth.deactivate3@test.com', hashedPassword, 'admin', 'active']
      );

      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          login: 'auth_deactivate3',
          password: 'testpass123'
        });

      const token = loginResponse.body.token;

      const response = await request(app)
        .patch('/api/users/abc/deactivate')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'ID do usuário inválido');

      // Limpar
      await pool.query('DELETE FROM users WHERE username = $1', ['auth_deactivate3']);
    });

    test('Should fail to deactivate without token', async () => {
      const response = await request(app)
        .patch('/api/users/1/deactivate');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/users/:id (Protected)', () => {
    test('Should soft delete user successfully', async () => {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('testpass123', 10);

      const testUsername = generateTestUsername('del');
      const testEmail = generateTestEmail('del.test');
      const adminUsername = generateTestUsername('admin_del');
      const adminEmail = generateTestEmail('admin.del');

      // Criar usuário para deletar
      const userResult = await pool.query(
        `INSERT INTO users (first_name, last_name, username, email, password_hash, role, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id`,
        ['Delete', 'Test', testUsername, testEmail, hashedPassword, 'user', 'active']
      );

      const userId = userResult.rows[0].id;

      // Criar admin para obter token
      await pool.query(
        `INSERT INTO users (first_name, last_name, username, email, password_hash, role, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id`,
        ['Auth', 'Delete', adminUsername, adminEmail, hashedPassword, 'admin', 'active']
      );

      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          login: adminUsername,
          password: 'testpass123'
        });

      const token = loginResponse.body.token;

      // Soft delete do usuário
      const response = await request(app)
        .delete(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Usuário removido com sucesso (soft delete)');
      expect(response.body.data).toHaveProperty('deleted_at');
      expect(response.body.deleteType).toBe('soft');

      // Verificar se foi soft deleted
      const checkResult = await pool.query('SELECT deleted_at, status FROM users WHERE id = $1', [userId]);
      expect(checkResult.rows[0].deleted_at).not.toBeNull();
      expect(checkResult.rows[0].status).toBe('inactive');

      // Limpar
      await pool.query('DELETE FROM users WHERE username = $1 OR username = $2', [testUsername, adminUsername]);
    });

    test('Should hard delete user successfully', async () => {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('testpass123', 10);

      const testUsername = generateTestUsername('hdel');
      const testEmail = generateTestEmail('hdel.test');
      const adminUsername = generateTestUsername('admin_hdel');
      const adminEmail = generateTestEmail('admin.hdel');

      // Criar usuário para deletar
      const userResult = await pool.query(
        `INSERT INTO users (first_name, last_name, username, email, password_hash, role, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id`,
        ['HardDelete', 'Test', testUsername, testEmail, hashedPassword, 'user', 'active']
      );

      const userId = userResult.rows[0].id;

      // Criar admin para obter token
      await pool.query(
        `INSERT INTO users (first_name, last_name, username, email, password_hash, role, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id`,
        ['Auth', 'HardDelete', adminUsername, adminEmail, hashedPassword, 'admin', 'active']
      );

      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          login: adminUsername,
          password: 'testpass123'
        });

      const token = loginResponse.body.token;

      // Hard delete do usuário
      const response = await request(app)
        .delete(`/api/users/${userId}?hardDelete=true`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Usuário removido permanentemente com sucesso');
      expect(response.body.deleteType).toBe('hard');

      // Verificar se foi hard deleted
      const checkResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
      expect(checkResult.rows.length).toBe(0);

      // Limpar
      await pool.query('DELETE FROM users WHERE username = $1', [adminUsername]);
    });

    test('Should fail to soft delete already deleted user', async () => {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('testpass123', 10);

      const testUsername = generateTestUsername('aldel');
      const testEmail = generateTestEmail('aldel.test');
      const adminUsername = generateTestUsername('admin_aldel');
      const adminEmail = generateTestEmail('admin.aldel');

      // Criar usuário já deletado
      const userResult = await pool.query(
        `INSERT INTO users (first_name, last_name, username, email, password_hash, role, status, deleted_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
          RETURNING id`,
        ['Already', 'Deleted', testUsername, testEmail, hashedPassword, 'user', 'inactive']
      );

      const userId = userResult.rows[0].id;

      // Criar admin para obter token
      await pool.query(
        `INSERT INTO users (first_name, last_name, username, email, password_hash, role, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        ['Auth', 'AlreadyDeleted', adminUsername, adminEmail, hashedPassword, 'admin', 'active']
      );

      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          login: adminUsername,
          password: 'testpass123'
        });

      const token = loginResponse.body.token;

      const response = await request(app)
        .delete(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Usuário já foi removido');

      // Limpar
      await pool.query('DELETE FROM users WHERE username = $1 OR username = $2', [testUsername, adminUsername]);
    });

    test('Should fail to delete non-existent user', async () => {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('testpass123', 10);

      const adminUsername = generateTestUsername('admin_nex');
      const adminEmail = generateTestEmail('admin.nex');

      await pool.query(
        `INSERT INTO users (first_name, last_name, username, email, password_hash, role, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        ['Auth', 'Nonexist', adminUsername, adminEmail, hashedPassword, 'admin', 'active']
      );

      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          login: adminUsername,
          password: 'testpass123'
        });

      const token = loginResponse.body.token;

      const response = await request(app)
        .delete('/api/users/999999')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Usuário não encontrado');

      // Limpar
      await pool.query('DELETE FROM users WHERE username = $1', [adminUsername]);
    });

    test('Should fail to delete with invalid ID', async () => {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('testpass123', 10);

      const adminUsername = generateTestUsername('admin_inv');
      const adminEmail = generateTestEmail('admin.inv');

      await pool.query(
        `INSERT INTO users (first_name, last_name, username, email, password_hash, role, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        ['Auth', 'InvalidId', adminUsername, adminEmail, hashedPassword, 'admin', 'active']
      );

      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          login: adminUsername,
          password: 'testpass123'
        });

      const token = loginResponse.body.token;

      const response = await request(app)
        .delete('/api/users/xyz')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'ID do usuário inválido');

      // Limpar
      await pool.query('DELETE FROM users WHERE username = $1', [adminUsername]);
    });

    test('Should fail to delete without token', async () => {
      const response = await request(app)
        .delete('/api/users/1');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });
});
