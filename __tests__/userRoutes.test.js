const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/database');

describe('User Routes API', () => {
  let authToken;
  let testUserId;
  let adminToken;
  let adminUserId;

  beforeAll(async () => {
    // Criar usuário de teste comum
    const userResult = await pool.query(
      `INSERT INTO users (first_name, last_name, username, email, password_hash, role, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id`,
      ['Test', 'User', 'testuser_routes', 'test.routes@test.com', '$2b$10$abcdefghijklmnopqrstuvwxyz', 'user', 'active']
    );
    testUserId = userResult.rows[0].id;

    // Criar usuário admin
    const adminResult = await pool.query(
      `INSERT INTO users (first_name, last_name, username, email, password_hash, role, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id`,
      ['Admin', 'Test', 'adminuser_test', 'admin.test@test.com', '$2b$10$abcdefghijklmnopqrstuvwxyz', 'admin', 'active']
    );
    adminUserId = adminResult.rows[0].id;
  });

  afterAll(async () => {
    // Limpar dados de teste
    await pool.query('DELETE FROM users WHERE id IN ($1, $2)', [testUserId, adminUserId]);
    await pool.end();
  });

  describe('POST /api/users/register', () => {
    test('Should register new user successfully', async () => {
      const response = await request(app)
        .post('/api/users/register')
        .send({
          first_name: 'John',
          last_name: 'Doe',
          username: 'johndoe_reg',
          email: 'john.reg@test.com',
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
      expect(response.body.user.username).toBe('johndoe_reg');

      // Limpar
      await pool.query('DELETE FROM users WHERE username = $1', ['johndoe_reg']);
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
          username: 'testuser_routes',
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

      const userResult = await pool.query(
        `INSERT INTO users (first_name, last_name, username, email, password_hash, role, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id`,
        ['GetById', 'Test', 'getbyid_test', 'getbyid.test@test.com', hashedPassword, 'user', 'active']
      );

      const userId = userResult.rows[0].id;

      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          login: 'getbyid_test',
          password: 'testpass123'
        });

      const token = loginResponse.body.token;

      const response = await request(app)
        .get(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data.id).toBe(userId);
      expect(response.body.data.username).toBe('getbyid_test');

      // Limpar
      await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    });

    test('Should fail with invalid ID format', async () => {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('testpass123', 10);

      await pool.query(
        `INSERT INTO users (first_name, last_name, username, email, password_hash, role, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (username) DO NOTHING`,
        ['Invalid', 'Test', 'invalid_test', 'invalid.test@test.com', hashedPassword, 'user', 'active']
      );

      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          login: 'invalid_test',
          password: 'testpass123'
        });

      const token = loginResponse.body.token;

      const response = await request(app)
        .get('/api/users/abc')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');

      // Limpar
      await pool.query('DELETE FROM users WHERE username = $1', ['invalid_test']);
    });
  });

  describe('GET /api/users/profile (Protected)', () => {
    test('Should get own profile with valid token', async () => {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('testpass123', 10);

      await pool.query(
        `INSERT INTO users (first_name, last_name, username, email, password_hash, role, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (username) DO NOTHING`,
        ['Profile', 'Test', 'profile_test', 'profile.test@test.com', hashedPassword, 'user', 'active']
      );

      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          login: 'profile_test',
          password: 'testpass123'
        });

      const token = loginResponse.body.token;

      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('username', 'profile_test');
      expect(response.body).toHaveProperty('email', 'profile.test@test.com');
      expect(response.body).not.toHaveProperty('password_hash');

      // Limpar
      await pool.query('DELETE FROM users WHERE username = $1', ['profile_test']);
    });
  });

  describe('PUT /api/users/profile (Protected)', () => {
    test('Should update own profile', async () => {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('testpass123', 10);

      await pool.query(
        `INSERT INTO users (first_name, last_name, username, email, password_hash, role, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (username) DO NOTHING`,
        ['Update', 'Test', 'update_test', 'update.test@test.com', hashedPassword, 'user', 'active']
      );

      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          login: 'update_test',
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
      await pool.query('DELETE FROM users WHERE username = $1', ['update_test']);
    });
  });

  describe('PUT /api/users/change-password (Protected)', () => {
    test('Should change password with current password', async () => {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('oldpass123', 10);

      await pool.query(
        `INSERT INTO users (first_name, last_name, username, email, password_hash, role, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (username) DO NOTHING`,
        ['Change', 'Pass', 'changepass_test', 'changepass.test@test.com', hashedPassword, 'user', 'active']
      );

      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          login: 'changepass_test',
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
      await pool.query('DELETE FROM users WHERE username = $1', ['changepass_test']);
    });

    test('Should fail with wrong current password', async () => {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('correctpass', 10);

      await pool.query(
        `INSERT INTO users (first_name, last_name, username, email, password_hash, role, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (username) DO NOTHING`,
        ['Wrong', 'Pass', 'wrongpass_test', 'wrongpass.test@test.com', hashedPassword, 'user', 'active']
      );

      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          login: 'wrongpass_test',
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
      await pool.query('DELETE FROM users WHERE username = $1', ['wrongpass_test']);
    });
  });

  describe('POST /api/users/refresh-token', () => {
    test('Should refresh token with valid refresh token', async () => {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('testpass123', 10);

      await pool.query(
        `INSERT INTO users (first_name, last_name, username, email, password_hash, role, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (username) DO NOTHING`,
        ['Refresh', 'Test', 'refresh_test', 'refresh.test@test.com', hashedPassword, 'user', 'active']
      );

      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          login: 'refresh_test',
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
      await pool.query('DELETE FROM users WHERE username = $1', ['refresh_test']);
    });

    test('Should fail without refresh token', async () => {
      const response = await request(app)
        .post('/api/users/refresh-token')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });
});
