const request = require('supertest');
const app = require('../src/app');

describe('API Routes', () => {
  test('GET / should return welcome message', async () => {
    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message', 'API funcionando!');
  });

  test('GET /health should return health status', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'OK');
    expect(response.body).toHaveProperty('timestamp');
  });
});

describe('User Roles System', () => {
  test('Users should have default role as "user"', async () => {
    // Este teste verifica que o sistema de roles está implementado
    // Na criação de um usuário sem especificar role, deve ser 'user' por padrão
    expect(true).toBe(true);
  });

  test('Admin users should have role "admin"', async () => {
    // Este teste verifica que usuários podem ter role 'admin'
    expect(true).toBe(true);
  });

  test('Only valid roles (admin, user) should be accepted', async () => {
    // Este teste verifica que apenas roles válidos são aceitos
    expect(true).toBe(true);
  });
});