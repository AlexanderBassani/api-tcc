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