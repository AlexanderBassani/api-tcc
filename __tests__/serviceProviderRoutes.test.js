const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/database');
const { generateTestUsername, generateTestEmail } = require('./helpers/testUtils');

describe('Service Provider Routes API', () => {
  let userId, adminId;
  let userToken, adminToken;
  let testProvider;

  beforeAll(async () => {
    // Criar usuário de teste
    const testUsername = generateTestUsername('provideruser');
    const testEmail = generateTestEmail('provideruser');

    const userResponse = await request(app)
      .post('/api/users/register')
      .send({
        username: testUsername,
        email: testEmail,
        password: 'Test@123',
        first_name: 'Provider',
        last_name: 'Test'
      });

    if (!userResponse.body.user) {
      console.error('User registration failed:', userResponse.body);
      throw new Error('User registration failed');
    }

    userId = userResponse.body.user.id;
    userToken = userResponse.body.token;

    // Criar admin de teste
    const adminUsername = generateTestUsername('provideradmin');
    const adminEmail = generateTestEmail('provideradmin');

    const adminResponse = await request(app)
      .post('/api/users/register')
      .send({
        username: adminUsername,
        email: adminEmail,
        password: 'Admin@123',
        first_name: 'Admin',
        last_name: 'Provider'
      });

    if (!adminResponse.body.user) {
      console.error('Admin registration failed:', adminResponse.body);
      throw new Error('Admin registration failed');
    }

    adminId = adminResponse.body.user.id;
    adminToken = adminResponse.body.token;
  });

  afterAll(async () => {
    // Limpar dados de teste
    await pool.query('DELETE FROM service_providers WHERE user_id IN ($1, $2)', [userId, adminId]);
    await pool.query('DELETE FROM users WHERE id IN ($1, $2)', [userId, adminId]);
    await pool.end();
  });

  describe('POST /api/service-providers', () => {
    test('Should create service provider successfully', async () => {
      const response = await request(app)
        .post('/api/service-providers')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Oficina Central',
          type: 'oficina',
          phone: '(11) 98765-4321',
          email: 'contato@oficinacentral.com',
          address: 'Rua das Flores, 123 - Centro',
          rating: 4.5,
          notes: 'Excelente atendimento',
          is_favorite: true
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe('Oficina Central');
      expect(response.body.data.type).toBe('oficina');
      expect(response.body.data.phone).toBe('(11) 98765-4321');
      expect(parseFloat(response.body.data.rating)).toBe(4.5);
      expect(response.body.data.is_favorite).toBe(true);

      testProvider = response.body.data;
    });

    test('Should create service provider with minimal data', async () => {
      const response = await request(app)
        .post('/api/service-providers')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Lava Jato Express',
          type: 'lava-jato'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Lava Jato Express');
      expect(response.body.data.type).toBe('lava-jato');
      expect(parseFloat(response.body.data.rating)).toBe(0.0);
      expect(response.body.data.is_favorite).toBe(false);
    });

    test('Should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/service-providers')
        .send({
          name: 'Oficina Teste',
          type: 'oficina'
        });

      expect(response.status).toBe(401);
    });

    test('Should fail without name', async () => {
      const response = await request(app)
        .post('/api/service-providers')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          type: 'oficina'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeTruthy();
    });

    test('Should fail without type', async () => {
      const response = await request(app)
        .post('/api/service-providers')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Oficina Teste'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeTruthy();
    });

    test('Should fail with invalid type', async () => {
      const response = await request(app)
        .post('/api/service-providers')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Oficina Teste',
          type: 'tipo-invalido'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeTruthy();
    });

    test('Should fail with invalid rating', async () => {
      const response = await request(app)
        .post('/api/service-providers')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Oficina Teste',
          type: 'oficina',
          rating: 6.0
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeTruthy();
    });

    test('Should fail with invalid email', async () => {
      const response = await request(app)
        .post('/api/service-providers')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Oficina Teste',
          type: 'oficina',
          email: 'email-invalido'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeTruthy();
    });
  });

  describe('GET /api/service-providers', () => {
    test('Should list all service providers', async () => {
      const response = await request(app)
        .get('/api/service-providers')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    });

    test('Should filter by type', async () => {
      const response = await request(app)
        .get('/api/service-providers?type=oficina')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.every(p => p.type === 'oficina')).toBe(true);
    });

    test('Should filter by is_favorite', async () => {
      const response = await request(app)
        .get('/api/service-providers?is_favorite=true')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.every(p => p.is_favorite === true)).toBe(true);
    });

    test('Should filter by min_rating', async () => {
      const response = await request(app)
        .get('/api/service-providers?min_rating=4.0')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.every(p => parseFloat(p.rating) >= 4.0)).toBe(true);
    });

    test('Should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/service-providers');

      expect(response.status).toBe(401);
    });

    test('Should not list other users providers', async () => {
      // Admin cria um prestador
      await request(app)
        .post('/api/service-providers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Prestador Admin',
          type: 'oficina'
        });

      // User lista seus prestadores
      const response = await request(app)
        .get('/api/service-providers')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.every(p => p.user_id === userId)).toBe(true);
    });
  });

  describe('GET /api/service-providers/favorites', () => {
    test('Should list favorite providers', async () => {
      const response = await request(app)
        .get('/api/service-providers/favorites')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.every(p => p.is_favorite === true)).toBe(true);
    });

    test('Should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/service-providers/favorites');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/service-providers/type/:type', () => {
    test('Should list providers by type', async () => {
      const response = await request(app)
        .get('/api/service-providers/type/lava-jato')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.every(p => p.type === 'lava-jato')).toBe(true);
    });

    test('Should fail with invalid type', async () => {
      const response = await request(app)
        .get('/api/service-providers/type/tipo-invalido')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBeTruthy();
    });

    test('Should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/service-providers/type/oficina');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/service-providers/:id', () => {
    test('Should get service provider by ID', async () => {
      const response = await request(app)
        .get(`/api/service-providers/${testProvider.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testProvider.id);
      expect(response.body.data.name).toBe('Oficina Central');
    });

    test('Should fail for non-existent provider', async () => {
      const response = await request(app)
        .get('/api/service-providers/999999')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Prestador de serviço não encontrado');
    });

    test('Should fail without authentication', async () => {
      const response = await request(app)
        .get(`/api/service-providers/${testProvider.id}`);

      expect(response.status).toBe(401);
    });

    test('Should fail with invalid ID', async () => {
      const response = await request(app)
        .get('/api/service-providers/invalid')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBeTruthy();
    });

    test('Should not access other users provider', async () => {
      // Admin cria um prestador
      const adminProvider = await request(app)
        .post('/api/service-providers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Prestador Admin Específico',
          type: 'borracharia'
        });

      // User tenta acessar
      const response = await request(app)
        .get(`/api/service-providers/${adminProvider.body.data.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/service-providers/:id', () => {
    test('Should update service provider successfully', async () => {
      const response = await request(app)
        .put(`/api/service-providers/${testProvider.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Oficina Central Premium',
          rating: 5.0,
          notes: 'Melhor oficina da região'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Oficina Central Premium');
      expect(parseFloat(response.body.data.rating)).toBe(5.0);
      expect(response.body.data.notes).toBe('Melhor oficina da região');
    });

    test('Should update is_favorite', async () => {
      const response = await request(app)
        .put(`/api/service-providers/${testProvider.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          is_favorite: false
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.is_favorite).toBe(false);
    });

    test('Should fail for non-existent provider', async () => {
      const response = await request(app)
        .put('/api/service-providers/999999')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Teste'
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Prestador de serviço não encontrado');
    });

    test('Should fail without authentication', async () => {
      const response = await request(app)
        .put(`/api/service-providers/${testProvider.id}`)
        .send({
          name: 'Teste'
        });

      expect(response.status).toBe(401);
    });

    test('Should fail with invalid rating', async () => {
      const response = await request(app)
        .put(`/api/service-providers/${testProvider.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          rating: 10.0
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeTruthy();
    });

    test('Should fail with invalid type', async () => {
      const response = await request(app)
        .put(`/api/service-providers/${testProvider.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          type: 'tipo-invalido'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeTruthy();
    });

    test('Should fail with invalid ID', async () => {
      const response = await request(app)
        .put('/api/service-providers/invalid')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Teste'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeTruthy();
    });
  });

  describe('DELETE /api/service-providers/:id', () => {
    test('Should delete service provider successfully', async () => {
      // Criar um prestador para deletar
      const createResponse = await request(app)
        .post('/api/service-providers')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Prestador Para Deletar',
          type: 'outros'
        });

      const providerId = createResponse.body.data.id;

      const response = await request(app)
        .delete(`/api/service-providers/${providerId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Prestador de serviço excluído com sucesso');

      // Verificar se foi realmente deletado
      const checkResponse = await request(app)
        .get(`/api/service-providers/${providerId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(checkResponse.status).toBe(404);
    });

    test('Should fail for non-existent provider', async () => {
      const response = await request(app)
        .delete('/api/service-providers/999999')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Prestador de serviço não encontrado');
    });

    test('Should fail without authentication', async () => {
      const response = await request(app)
        .delete(`/api/service-providers/${testProvider.id}`);

      expect(response.status).toBe(401);
    });

    test('Should fail with invalid ID', async () => {
      const response = await request(app)
        .delete('/api/service-providers/invalid')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBeTruthy();
    });

    test('Should not delete other users provider', async () => {
      // Admin cria um prestador
      const adminProvider = await request(app)
        .post('/api/service-providers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Prestador Admin Para Deletar',
          type: 'concessionária'
        });

      // User tenta deletar
      const response = await request(app)
        .delete(`/api/service-providers/${adminProvider.body.data.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
    });
  });
});
