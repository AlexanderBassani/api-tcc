const request = require('supertest');
const app = require('../src/app');
const { AppDataSource } = require('../src/config/typeorm');
const { generateTestUsername, generateTestEmail, generateTestPlate } = require('./helpers/testUtils');

// Ensure test environment
process.env.NODE_ENV = 'test';

// Repositories
let usersRepository;
let vehiclesRepository;
let maintenancesRepository;

// Inicializar repositories quando o Data Source estiver pronto
const getRepositories = () => {
  if (!AppDataSource.isInitialized) {
    throw new Error('Database not initialized. Please ensure TypeORM is initialized before accessing repositories.');
  }
  if (!usersRepository) {
    usersRepository = AppDataSource.getRepository('User');
  }
  if (!vehiclesRepository) {
    vehiclesRepository = AppDataSource.getRepository('Vehicle');
  }
  if (!maintenancesRepository) {
    maintenancesRepository = AppDataSource.getRepository('Maintenance');
  }
  return { usersRepository, vehiclesRepository, maintenancesRepository };
};

describe('Maintenance Routes API', () => {
  let userToken;
  let userId;
  let vehicleId;
  let testMaintenanceId;

  beforeAll(async () => {
    // Criar usuário de teste via API
    const testUsername = generateTestUsername('maintenanceuser');
    const testEmail = generateTestEmail('maintenanceuser');

    const registerResponse = await request(app)
      .post('/api/users/register')
      .send({
        first_name: 'Maintenance',
        last_name: 'User',
        username: testUsername,
        email: testEmail,
        password: 'password123'
      });

    userId = registerResponse.body.user.id;

    // Fazer login
    const loginResponse = await request(app)
      .post('/api/users/login')
      .send({
        login: testUsername,
        password: 'password123'
      });
    userToken = loginResponse.body.token;

    // Criar um veículo de teste com placa única
    const testPlate = generateTestPlate('mercosul');
    const vehicleResponse = await request(app)
      .post('/api/vehicles')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        brand: 'Toyota',
        model: 'Corolla',
        year: 2020,
        plate: testPlate,
        color: 'Branco',
        current_km: 50000
      });
    vehicleId = vehicleResponse.body.data.id;
  });

  afterAll(async () => {
    // Limpar dados de teste
    const { usersRepository, vehiclesRepository } = getRepositories();
    await vehiclesRepository.delete({ user_id: userId });
    await usersRepository.delete({ id: userId });
  });

  describe('POST /api/maintenances', () => {
    // Skip: banco não tem coluna maintenance_type_id que a entidade TypeORM espera
    test('Should create maintenance successfully with valid data', async () => {
      const maintenanceData = {
        vehicle_id: vehicleId,
        type: 'Troca de óleo',
        category: 'preventive',
        description: 'Troca de óleo do motor e filtro',
        cost: 150.50,
        km_at_service: 51000,
        service_date: '2024-01-15',
        next_service_km: 56000,
        next_service_date: '2024-07-15',
        invoice_number: 'NF12345'
      };

      const response = await request(app)
        .post('/api/maintenances')
        .set('Authorization', `Bearer ${userToken}`)
        .send(maintenanceData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Manutenção cadastrada com sucesso');
      expect(response.body.data).toMatchObject({
        vehicle_id: vehicleId,
        type: 'Troca de óleo',
        category: 'preventive',
        km_at_service: 51000
      });
      expect(parseFloat(response.body.data.cost)).toBe(150.5);

      testMaintenanceId = response.body.data.id;
    });

    test('Should fail to create maintenance without authentication', async () => {
      const response = await request(app)
        .post('/api/maintenances')
        .send({
          vehicle_id: vehicleId,
          type: 'Troca de óleo',
          service_date: '2024-01-15'
        });

      expect(response.status).toBe(401);
    });

    test('Should fail with missing required fields', async () => {
      const response = await request(app)
        .post('/api/maintenances')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          vehicle_id: vehicleId
          // Missing type and service_date
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('obrigatório');
    });

    test('Should fail with invalid vehicle_id', async () => {
      const response = await request(app)
        .post('/api/maintenances')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          vehicle_id: 99999,
          type: 'Troca de óleo',
          service_date: '2024-01-15'
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Acesso negado');
    });

    test('Should fail with invalid cost', async () => {
      const response = await request(app)
        .post('/api/maintenances')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          vehicle_id: vehicleId,
          type: 'Troca de óleo',
          service_date: '2024-01-15',
          cost: -50
        });

      expect(response.status).toBe(400);
      expect(response.body.details[0].message).toContain('positivo');
    });

    test('Should create maintenance with default category (other) when not provided', async () => {
      const maintenanceData = {
        vehicle_id: vehicleId,
        type: 'Serviço genérico',
        description: 'Serviço sem categoria especificada',
        cost: 100.00,
        km_at_service: 52000,
        service_date: '2024-02-15'
      };

      const response = await request(app)
        .post('/api/maintenances')
        .set('Authorization', `Bearer ${userToken}`)
        .send(maintenanceData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.category).toBe('other');
    });

    test('Should create maintenance with corrective category', async () => {
      const maintenanceData = {
        vehicle_id: vehicleId,
        type: 'Reparo no freio',
        category: 'corrective',
        description: 'Troca de pastilhas de freio',
        cost: 280.00,
        km_at_service: 53000,
        service_date: '2024-03-15'
      };

      const response = await request(app)
        .post('/api/maintenances')
        .set('Authorization', `Bearer ${userToken}`)
        .send(maintenanceData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.category).toBe('corrective');
    });

    test('Should fail with invalid category', async () => {
      const response = await request(app)
        .post('/api/maintenances')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          vehicle_id: vehicleId,
          type: 'Troca de óleo',
          category: 'invalid_category',
          description: 'Teste',
          cost: 150.00,
          km_at_service: 54000,
          service_date: '2024-04-15'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.details[0].message).toContain('Categoria inválida');
    });

    test('Should accept all valid category values', async () => {
      const validCategories = ['preventive', 'corrective', 'inspection', 'upgrade', 'warranty', 'recall', 'other'];

      for (const category of validCategories) {
        const response = await request(app)
          .post('/api/maintenances')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            vehicle_id: vehicleId,
            type: `Teste ${category}`,
            category: category,
            description: `Manutenção tipo ${category}`,
            cost: 100.00,
            km_at_service: 55000 + validCategories.indexOf(category),
            service_date: '2024-05-15'
          });

        expect(response.status).toBe(201);
        expect(response.body.data.category).toBe(category);
      }
    });
  });

  describe('GET /api/maintenances', () => {
    // Skip: sem manutenções criadas devido ao erro de maintenance_type_id
    test('Should list user maintenances successfully', async () => {
      const response = await request(app)
        .get('/api/maintenances')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.count).toBeGreaterThan(0);
    });

    test('Should filter maintenances by vehicle_id', async () => {
      const response = await request(app)
        .get(`/api/maintenances?vehicle_id=${vehicleId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.every(m => m.vehicle_id === vehicleId)).toBe(true);
    });

    test('Should filter maintenances by type', async () => {
      const response = await request(app)
        .get('/api/maintenances?type=óleo')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.every(m => m.type.toLowerCase().includes('óleo'))).toBe(true);
    });

    test('Should support pagination', async () => {
      const response = await request(app)
        .get('/api/maintenances?limit=5&offset=0')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.pagination.limit).toBe(5);
      expect(response.body.pagination.offset).toBe(0);
    });

    test('Should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/maintenances');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/maintenances/:id', () => {
    // Skip: testMaintenanceId não foi criado devido ao erro
    test('Should get specific maintenance successfully', async () => {
      const response = await request(app)
        .get(`/api/maintenances/${testMaintenanceId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testMaintenanceId);
      expect(response.body.data.type).toBe('Troca de óleo');
    });

    test('Should fail with invalid maintenance ID', async () => {
      const response = await request(app)
        .get('/api/maintenances/99999')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Manutenção não encontrada');
    });

    test('Should fail with invalid ID format', async () => {
      const response = await request(app)
        .get('/api/maintenances/invalid')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/maintenances/vehicle/:vehicleId', () => {
    // Skip: endpoint falha devido ao erro de coluna maintenance_type_id
    test('Should get vehicle maintenances successfully', async () => {
      const response = await request(app)
        .get(`/api/maintenances/vehicle/${vehicleId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body).toHaveProperty('count');
    });

    test('Should fail with non-existent vehicle ID', async () => {
      const response = await request(app)
        .get('/api/maintenances/vehicle/99999')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Veículo não encontrado');
    });
  });

  describe('PUT /api/maintenances/:id', () => {
    // Skip: testMaintenanceId não foi criado
    test('Should update maintenance successfully', async () => {
      // Obter veículo para pegar quilometragem atual
      const vehicleResponse = await request(app)
        .get(`/api/vehicles/${vehicleId}`)
        .set('Authorization', `Bearer ${userToken}`);

      const currentKm = vehicleResponse.body.data.current_km;

      const updateData = {
        type: 'Troca de óleo e filtros',
        description: 'Troca de óleo do motor, filtro de óleo e filtro de ar',
        cost: 200.00,
        km_at_service: currentKm + 1000, // Usar quilometragem maior que a atual
        service_date: '2024-01-15',
        next_service_km: currentKm + 6000,
        next_service_date: '2024-07-15'
      };

      const response = await request(app)
        .put(`/api/maintenances/${testMaintenanceId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Manutenção atualizada com sucesso');
      expect(response.body.data.type).toBe('Troca de óleo e filtros');
      expect(parseFloat(response.body.data.cost)).toBe(200);
    });

    test('Should fail to update non-existent maintenance', async () => {
      const response = await request(app)
        .put('/api/maintenances/99999')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          type: 'Teste',
          service_date: '2024-01-15'
        });

      expect(response.status).toBe(404);
    });

    test('Should fail with invalid update data', async () => {
      const response = await request(app)
        .put(`/api/maintenances/${testMaintenanceId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          type: '', // Empty type
          service_date: '2024-01-15'
        });

      expect(response.status).toBe(400);
    });

    test('Should update maintenance category successfully', async () => {
      const updateData = {
        type: 'Revisão preventiva',
        category: 'inspection',
        service_date: '2024-01-15'
      };

      const response = await request(app)
        .put(`/api/maintenances/${testMaintenanceId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.category).toBe('inspection');
    });

    test('Should fail to update with invalid category', async () => {
      const response = await request(app)
        .put(`/api/maintenances/${testMaintenanceId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          type: 'Teste',
          category: 'invalid_category',
          service_date: '2024-01-15'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/maintenances/stats', () => {
    // Skip: sem manutenções criadas, stats retorna estrutura diferente
    test('Should get maintenance statistics successfully', async () => {
      const response = await request(app)
        .get('/api/maintenances/stats')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('total_maintenances');
      expect(response.body.data).toHaveProperty('total_cost');
      expect(response.body.data).toHaveProperty('average_cost');
    });

    // Skip: sem manutenções criadas
    test('Should filter stats by vehicle_id', async () => {
      const response = await request(app)
        .get(`/api/maintenances/stats?vehicle_id=${vehicleId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('total_maintenances');
      expect(typeof response.body.data.total_maintenances).toBe('number');
    });

    test('Should filter stats by year', async () => {
      const response = await request(app)
        .get('/api/maintenances/stats?year=2024')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('DELETE /api/maintenances/:id', () => {
    // Skip: testMaintenanceId não foi criado
    test('Should delete maintenance successfully', async () => {
      const response = await request(app)
        .delete(`/api/maintenances/${testMaintenanceId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Manutenção excluída com sucesso');
    });

    test('Should fail to delete non-existent maintenance', async () => {
      const response = await request(app)
        .delete('/api/maintenances/99999')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
    });

    test('Should fail without authentication', async () => {
      const response = await request(app)
        .delete('/api/maintenances/1');

      expect(response.status).toBe(401);
    });
  });

  describe('Security - Cross-user access', () => {
    let otherUserToken;
    let otherUserId;

    beforeAll(async () => {
      // Criar outro usuário
      const otherTestUsername = generateTestUsername('othermaintenanceuser');
      const otherTestEmail = generateTestEmail('othermaintenanceuser');

      const otherRegisterResponse = await request(app)
        .post('/api/users/register')
        .send({
          first_name: 'Other',
          last_name: 'User',
          username: otherTestUsername,
          email: otherTestEmail,
          password: 'password123'
        });

      otherUserId = otherRegisterResponse.body.user.id;

      const otherLoginResponse = await request(app)
        .post('/api/users/login')
        .send({
          login: otherTestUsername,
          password: 'password123'
        });
      otherUserToken = otherLoginResponse.body.token;
    });

    afterAll(async () => {
      const { usersRepository } = getRepositories();
      await usersRepository.delete({ id: otherUserId });
    });

    test('Should not create maintenance for other user vehicle', async () => {
      const response = await request(app)
        .post('/api/maintenances')
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({
          vehicle_id: vehicleId, // Vehicle belongs to first user
          type: 'Teste',
          service_date: '2024-01-15'
        });

      expect(response.status).toBe(403);
    });
  });

  describe('Validation edge cases', () => {
    // Skip: erro de maintenance_type_id
    test('Should handle minimum valid data', async () => {
      const response = await request(app)
        .post('/api/maintenances')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          vehicle_id: vehicleId,
          type: 'Te', // Minimum 2 chars
          service_date: '2024-01-15'
        });

      expect(response.status).toBe(201);

      // Cleanup
      const { maintenancesRepository } = getRepositories();
      await maintenancesRepository.delete({ id: response.body.data.id });
    });

    // Skip: erro de maintenance_type_id
    test('Should handle maximum cost value', async () => {
      const response = await request(app)
        .post('/api/maintenances')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          vehicle_id: vehicleId,
          type: 'Manutenção cara',
          service_date: '2024-01-15',
          cost: 999999.99
        });

      expect(response.status).toBe(201);

      // Cleanup
      const { maintenancesRepository } = getRepositories();
      await maintenancesRepository.delete({ id: response.body.data.id });
    });

    // Skip: erro de maintenance_type_id
    test('Should handle future service dates', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      const response = await request(app)
        .post('/api/maintenances')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          vehicle_id: vehicleId,
          type: 'Manutenção futura',
          service_date: '2024-01-15',
          next_service_date: futureDateStr
        });

      expect(response.status).toBe(201);

      // Cleanup
      const { maintenancesRepository } = getRepositories();
      await maintenancesRepository.delete({ id: response.body.data.id });
    });
  });
});

