const request = require('supertest');
const app = require('../src/app');
const { AppDataSource } = require('../src/config/typeorm');
const { generateTestUsername, generateTestEmail, generateTestPlate } = require('./helpers/testUtils');

// Repositories
let usersRepository;
let maintenanceTypesRepository;
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
  if (!maintenanceTypesRepository) {
    maintenanceTypesRepository = AppDataSource.getRepository('MaintenanceType');
  }
  if (!vehiclesRepository) {
    vehiclesRepository = AppDataSource.getRepository('Vehicle');
  }
  if (!maintenancesRepository) {
    maintenancesRepository = AppDataSource.getRepository('Maintenance');
  }
  return { usersRepository, maintenanceTypesRepository, vehiclesRepository, maintenancesRepository };
};

describe('Maintenance Type Routes API', () => {
  let userId, adminId;
  let userToken, adminToken;
  let testType;

  beforeAll(async () => {
    // Criar usuário regular de teste
    const testUsername = generateTestUsername('typeuser');
    const testEmail = generateTestEmail('typeuser');

    const userResponse = await request(app)
      .post('/api/users/register')
      .send({
        username: testUsername,
        email: testEmail,
        password: 'Test@123',
        first_name: 'Type',
        last_name: 'User'
      });

    if (!userResponse.body.user) {
      console.error('User registration failed:', userResponse.body);
      throw new Error('User registration failed');
    }

    userId = userResponse.body.user.id;
    userToken = userResponse.body.token;

    // Criar admin de teste
    const adminUsername = generateTestUsername('typeadmin');
    const adminEmail = generateTestEmail('typeadmin');

    const adminResponse = await request(app)
      .post('/api/users/register')
      .send({
        username: adminUsername,
        email: adminEmail,
        password: 'Admin@123',
        first_name: 'Admin',
        last_name: 'Type'
      });

    if (!adminResponse.body.user) {
      console.error('Admin registration failed:', adminResponse.body);
      throw new Error('Admin registration failed');
    }

    adminId = adminResponse.body.user.id;

    // Promover admin
    const { usersRepository } = getRepositories();
    const adminUser = await usersRepository.findOne({ where: { id: adminId } });
    adminUser.role = 'admin';
    await usersRepository.save(adminUser);

    // Login como admin para obter token atualizado com role correto
    const adminLoginResponse = await request(app)
      .post('/api/users/login')
      .send({
        login: adminUsername,
        password: 'Admin@123'
      });

    if (!adminLoginResponse.body.token) {
      console.error('Admin login failed:', adminLoginResponse.body);
      throw new Error('Admin login failed');
    }

    adminToken = adminLoginResponse.body.token;
  });

  afterAll(async () => {
    // Limpar dados de teste
    const { usersRepository, maintenanceTypesRepository } = getRepositories();

    if (testType) {
      await maintenanceTypesRepository.delete({ id: testType.id });
    }

    // Limpar outros tipos criados nos testes
    const typesToDelete = await maintenanceTypesRepository.find({
      where: { name: /^test_/ }
    });

    for (const type of typesToDelete) {
      await maintenanceTypesRepository.delete({ id: type.id });
    }

    // Deletar usuários
    await usersRepository.delete({ id: userId });
    await usersRepository.delete({ id: adminId });
  });

  describe('GET /api/maintenance-types', () => {
    test('Should list all maintenance types', async () => {
      const response = await request(app)
        .get('/api/maintenance-types')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(15); // Tipos pré-populados
    });

    test('Should filter by has_km_interval', async () => {
      const response = await request(app)
        .get('/api/maintenance-types?has_km_interval=true')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.every(t => t.typical_interval_km !== null)).toBe(true);
    });

    test('Should filter by has_month_interval', async () => {
      const response = await request(app)
        .get('/api/maintenance-types?has_month_interval=true')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.every(t => t.typical_interval_months !== null)).toBe(true);
    });

    test('Should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/maintenance-types');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/maintenance-types/:id', () => {
    test('Should get maintenance type by ID', async () => {
      // Buscar um tipo pré-populado (troca de óleo)
      const listResponse = await request(app)
        .get('/api/maintenance-types')
        .set('Authorization', `Bearer ${userToken}`);

      const oilChangeType = listResponse.body.data.find(t => t.name === 'troca_oleo');

      const response = await request(app)
        .get(`/api/maintenance-types/${oilChangeType.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('troca_oleo');
      expect(response.body.data.display_name).toBe('Troca de Óleo');
    });

    test('Should fail for non-existent type', async () => {
      const response = await request(app)
        .get('/api/maintenance-types/999999')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Tipo de manutenção não encontrado');
    });

    test('Should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/maintenance-types/1');

      expect(response.status).toBe(401);
    });

    test('Should fail with invalid ID', async () => {
      const response = await request(app)
        .get('/api/maintenance-types/invalid')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBeTruthy();
    });
  });

  describe('POST /api/maintenance-types', () => {
    test('Should create maintenance type as admin', async () => {
      const response = await request(app)
        .post('/api/maintenance-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'test_custom_type',
          display_name: 'Manutenção Customizada',
          typical_interval_km: 20000,
          typical_interval_months: 12,
          icon: 'custom'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe('test_custom_type');
      expect(response.body.data.display_name).toBe('Manutenção Customizada');
      expect(response.body.data.typical_interval_km).toBe(20000);

      testType = response.body.data;
    });

    test('Should create type with minimal data', async () => {
      // Gerar nome único para evitar conflito de duplicate key
      const uniqueName = `test_minimal_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

      const response = await request(app)
        .post('/api/maintenance-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: uniqueName,
          display_name: 'Tipo Mínimo'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(uniqueName);
      expect(response.body.data.typical_interval_km).toBeNull();
      expect(response.body.data.typical_interval_months).toBeNull();
    });

    test('Should fail as regular user', async () => {
      const response = await request(app)
        .post('/api/maintenance-types')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'test_forbidden',
          display_name: 'Proibido'
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Acesso negado');
    });

    test('Should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/maintenance-types')
        .send({
          name: 'test_noauth',
          display_name: 'Sem Auth'
        });

      expect(response.status).toBe(401);
    });

    test('Should fail without name', async () => {
      const response = await request(app)
        .post('/api/maintenance-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          display_name: 'Sem Nome'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeTruthy();
    });

    test('Should fail without display_name', async () => {
      const response = await request(app)
        .post('/api/maintenance-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'test_no_display'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeTruthy();
    });

    test('Should fail with duplicate name', async () => {
      const response = await request(app)
        .post('/api/maintenance-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'test_custom_type', // Já existe
          display_name: 'Duplicado'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Tipo já existe');
    });

    test('Should fail with invalid name format', async () => {
      const response = await request(app)
        .post('/api/maintenance-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Invalid Name', // Espaços e maiúsculas
          display_name: 'Nome Inválido'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeTruthy();
    });

    test('Should fail with invalid interval values', async () => {
      const response = await request(app)
        .post('/api/maintenance-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'test_invalid_interval',
          display_name: 'Intervalo Inválido',
          typical_interval_km: -1000
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeTruthy();
    });
  });

  describe('PUT /api/maintenance-types/:id', () => {
    test('Should update maintenance type as admin', async () => {
      const response = await request(app)
        .put(`/api/maintenance-types/${testType.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          display_name: 'Manutenção Customizada Atualizada',
          typical_interval_km: 25000
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.display_name).toBe('Manutenção Customizada Atualizada');
      expect(response.body.data.typical_interval_km).toBe(25000);
    });

    test('Should fail as regular user', async () => {
      const response = await request(app)
        .put(`/api/maintenance-types/${testType.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          display_name: 'Tentativa de Atualização'
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Acesso negado');
    });

    test('Should fail for non-existent type', async () => {
      const response = await request(app)
        .put('/api/maintenance-types/999999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          display_name: 'Inexistente'
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Tipo de manutenção não encontrado');
    });

    test('Should fail without authentication', async () => {
      const response = await request(app)
        .put(`/api/maintenance-types/${testType.id}`)
        .send({
          display_name: 'Sem Auth'
        });

      expect(response.status).toBe(401);
    });

    test('Should fail with invalid name format', async () => {
      const response = await request(app)
        .put(`/api/maintenance-types/${testType.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Invalid Name Format'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeTruthy();
    });

    test('Should fail with invalid ID', async () => {
      const response = await request(app)
        .put('/api/maintenance-types/invalid')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          display_name: 'Teste'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeTruthy();
    });
  });

  describe('DELETE /api/maintenance-types/:id', () => {
    // Skip: depende de criar manutenção, que falha por erro de maintenance_type_id
    test('Should fail to delete type in use', async () => {
      const { vehiclesRepository, maintenancesRepository } = getRepositories();

      // Obter um tipo pré-populado (troca de óleo)
      const typesResponse = await request(app)
        .get('/api/maintenance-types')
        .set('Authorization', `Bearer ${adminToken}`);

      const oilChangeType = typesResponse.body.data.find(t => t.name === 'troca_oleo');

      // Criar um veículo
      const testPlate = generateTestPlate('mercosul');
      const vehicleResponse = await request(app)
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          brand: 'Toyota',
          model: 'Corolla',
          year: 2020,
          plate: testPlate,
          current_km: 10000
        });

      const vehicleId = vehicleResponse.body.data.id;

      // Criar uma manutenção usando o tipo pré-populado
      const maintenanceResponse = await request(app)
        .post('/api/maintenances')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          vehicle_id: vehicleId,
          type: oilChangeType.name,
          description: 'Troca de Óleo de Teste',
          cost: 150.00,
          service_date: '2024-01-15',
          km_at_service: 15000
        });

      // Verificar se a manutenção foi criada com sucesso
      expect(maintenanceResponse.status).toBe(201);

      // Tentar deletar o tipo pré-populado que está em uso
      const response = await request(app)
        .delete(`/api/maintenance-types/${oilChangeType.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Tipo em uso');
      expect(response.body.message).toContain('manutenções cadastradas');

      // Limpar dados de teste
      await maintenancesRepository.delete({ id: maintenanceResponse.body.data.id });
      await vehiclesRepository.delete({ id: vehicleId });
    });

    test('Should delete maintenance type successfully', async () => {
      // Criar um tipo para deletar
      const createResponse = await request(app)
        .post('/api/maintenance-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'test_to_delete',
          display_name: 'Tipo Para Deletar'
        });

      const typeId = createResponse.body.data.id;

      const response = await request(app)
        .delete(`/api/maintenance-types/${typeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Tipo de manutenção excluído com sucesso');

      // Verificar se foi realmente deletado
      const checkResponse = await request(app)
        .get(`/api/maintenance-types/${typeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(checkResponse.status).toBe(404);
    });

    test('Should fail as regular user', async () => {
      const response = await request(app)
        .delete(`/api/maintenance-types/${testType.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Acesso negado');
    });

    test('Should fail for non-existent type', async () => {
      const response = await request(app)
        .delete('/api/maintenance-types/999999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Tipo de manutenção não encontrado');
    });

    test('Should fail without authentication', async () => {
      const response = await request(app)
        .delete(`/api/maintenance-types/${testType.id}`);

      expect(response.status).toBe(401);
    });

    test('Should fail with invalid ID', async () => {
      const response = await request(app)
        .delete('/api/maintenance-types/invalid')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBeTruthy();
    });
  });
});


