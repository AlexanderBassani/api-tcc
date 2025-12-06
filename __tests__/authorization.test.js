const request = require('supertest');
const app = require('../src/app');
const { AppDataSource } = require('../src/config/typeorm');
const bcrypt = require('bcrypt');
const { generateTestUsername, generateTestEmail } = require('./helpers/testUtils');

// Repositories
let usersRepository;

const getRepositories = () => {
  if (!AppDataSource.isInitialized) {
    throw new Error('Database not initialized');
  }
  if (!usersRepository) {
    usersRepository = AppDataSource.getRepository('User');
  }
  return { usersRepository };
};

describe('Authorization Middleware', () => {
  let adminToken;
  let userToken;
  let adminUserId;
  let regularUserId;
  let targetUserId;

  beforeAll(async () => {
    const { usersRepository } = getRepositories();
    const hashedPassword = await bcrypt.hash('testpass123', 10);

    // Gerar usernames únicos para evitar conflitos
    const adminUsername = generateTestUsername('admin_auth');
    const adminEmail = generateTestEmail('admin.auth');
    const regularUsername = generateTestUsername('user_auth');
    const regularEmail = generateTestEmail('user.auth');
    const targetUsername = generateTestUsername('target_auth');
    const targetEmail = generateTestEmail('target.auth');

    // Criar usuário admin
    const adminUser = usersRepository.create({
      first_name: 'Admin',
      last_name: 'User',
      username: adminUsername,
      email: adminEmail,
      password_hash: hashedPassword,
      role: 'admin',
      status: 'active'
    });
    const savedAdmin = await usersRepository.save(adminUser);
    adminUserId = savedAdmin.id;

    // Criar usuário regular
    const regularUser = usersRepository.create({
      first_name: 'Regular',
      last_name: 'User',
      username: regularUsername,
      email: regularEmail,
      password_hash: hashedPassword,
      role: 'user',
      status: 'active'
    });
    const savedRegular = await usersRepository.save(regularUser);
    regularUserId = savedRegular.id;

    // Criar usuário alvo para testes de deleção/inativação
    const targetUser = usersRepository.create({
      first_name: 'Target',
      last_name: 'User',
      username: targetUsername,
      email: targetEmail,
      password_hash: hashedPassword,
      role: 'user',
      status: 'active'
    });
    const savedTarget = await usersRepository.save(targetUser);
    targetUserId = savedTarget.id;

    // Fazer login como admin
    const adminLogin = await request(app)
      .post('/api/users/login')
      .send({
        login: adminUsername,
        password: 'testpass123'
      });
    adminToken = adminLogin.body.token;

    // Fazer login como usuário regular
    const userLogin = await request(app)
      .post('/api/users/login')
      .send({
        login: regularUsername,
        password: 'testpass123'
      });
    userToken = userLogin.body.token;
  });

  afterAll(async () => {
    // Limpar dados de teste
    const { usersRepository } = getRepositories();
    await usersRepository.delete({ id: adminUserId });
    await usersRepository.delete({ id: regularUserId });
    await usersRepository.delete({ id: targetUserId });
  });

  describe('POST /api/users (Create User - Admin Only)', () => {
    test('Should allow admin to create user', async () => {
      const { usersRepository } = getRepositories();
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
      await usersRepository.delete({ username: 'newuser_auth_test' });
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
      const { usersRepository } = getRepositories();
      const hashedPassword = await bcrypt.hash('testpass123', 10);

      const testUsername = generateTestUsername('deact_auth');
      const testEmail = generateTestEmail('deact.auth');

      const testUser = usersRepository.create({
        first_name: 'Deactivate',
        last_name: 'Test',
        username: testUsername,
        email: testEmail,
        password_hash: hashedPassword,
        role: 'user',
        status: 'active'
      });
      const savedUser = await usersRepository.save(testUser);
      const userId = savedUser.id;

      const response = await request(app)
        .patch(`/api/users/${userId}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Usuário inativado com sucesso');
      expect(response.body.data.status).toBe('inactive');

      // Limpar
      await usersRepository.delete({ username: testUsername });
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
      const { usersRepository } = getRepositories();
      const hashedPassword = await bcrypt.hash('testpass123', 10);

      const testUsername = generateTestUsername('del_auth');
      const testEmail = generateTestEmail('del.auth');

      const testUser = usersRepository.create({
        first_name: 'Delete',
        last_name: 'Test',
        username: testUsername,
        email: testEmail,
        password_hash: hashedPassword,
        role: 'user',
        status: 'active'
      });
      const savedUser = await usersRepository.save(testUser);
      const userId = savedUser.id;

      const response = await request(app)
        .delete(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Usuário removido com sucesso');

      // Limpar
      await usersRepository.delete({ username: testUsername });
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
      const { usersRepository } = getRepositories();
      const hashedPassword = await bcrypt.hash('testpass123', 10);

      const testUsername = generateTestUsername('hdel_auth');
      const testEmail = generateTestEmail('hdel.auth');

      const testUser = usersRepository.create({
        first_name: 'HardDelete',
        last_name: 'Test',
        username: testUsername,
        email: testEmail,
        password_hash: hashedPassword,
        role: 'user',
        status: 'active'
      });
      const savedUser = await usersRepository.save(testUser);
      const userId = savedUser.id;

      const response = await request(app)
        .delete(`/api/users/${userId}?hardDelete=true`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Usuário excluído permanentemente');

      // Verificar se foi removido
      const checkUser = await usersRepository.findOne({ where: { id: userId } });
      expect(checkUser).toBeNull();
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

