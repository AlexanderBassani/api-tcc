const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/database');
const { generateTestUsername, generateTestEmail, generateTestPlate } = require('./helpers/testUtils');

// Ensure test environment
process.env.NODE_ENV = 'test';

describe('Vehicle Routes API', () => {
  let userToken;
  let userId;
  let adminToken;
  let adminId;
  let testVehicleId;

  beforeAll(async () => {
    // Criar usuário de teste comum via API
    const testUsername = generateTestUsername('vehicleuser');
    const testEmail = generateTestEmail('vehicleuser');

    const registerResponse = await request(app)
      .post('/api/users/register')
      .send({
        first_name: 'Vehicle',
        last_name: 'User',
        username: testUsername,
        email: testEmail,
        password: 'password123'
      });

    userId = registerResponse.body.user?.id;

    // Fazer login do usuário comum
    const loginResponse = await request(app)
      .post('/api/users/login')
      .send({
        login: testUsername,
        password: 'password123'
      });

    userToken = loginResponse.body.token;

    // Criar usuário admin via API
    const adminUsername = generateTestUsername('vehicleadmin');
    const adminEmail = generateTestEmail('vehicleadmin');

    const adminRegisterResponse = await request(app)
      .post('/api/users/register')
      .send({
        first_name: 'Vehicle',
        last_name: 'Admin',
        username: adminUsername,
        email: adminEmail,
        password: 'password123'
      });

    adminId = adminRegisterResponse.body.user.id;

    // Atualizar role para admin
    await pool.query(
      'UPDATE users SET role = $1 WHERE id = $2',
      ['admin', adminId]
    );

    // Fazer login do admin
    const adminLoginResponse = await request(app)
      .post('/api/users/login')
      .send({
        login: adminUsername,
        password: 'password123'
      });
    adminToken = adminLoginResponse.body.token;
  });

  afterAll(async () => {
    // Limpar todos os dados de teste
    await pool.query('DELETE FROM vehicles WHERE user_id IN ($1, $2)', [userId, adminId]);
    await pool.query('DELETE FROM users WHERE id IN ($1, $2)', [userId, adminId]);
    await pool.end();
  });

  // Helper function para gerar placa única
  const generateTestPlate = () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    return `${letters.charAt(Math.floor(Math.random() * letters.length))}${letters.charAt(Math.floor(Math.random() * letters.length))}${letters.charAt(Math.floor(Math.random() * letters.length))}${numbers.charAt(Math.floor(Math.random() * numbers.length))}${letters.charAt(Math.floor(Math.random() * letters.length))}${numbers.charAt(Math.floor(Math.random() * numbers.length))}${numbers.charAt(Math.floor(Math.random() * numbers.length))}`;
  };

  describe('POST /api/vehicles', () => {
    test('Should create vehicle successfully with valid data', async () => {
      const testPlate = generateTestPlate();
      const vehicleData = {
        brand: 'Toyota',
        model: 'Corolla',
        year: 2022,
        plate: testPlate,
        color: 'Branco',
        current_km: 15000,
        purchase_date: '2022-01-15',
        notes: 'Veículo em bom estado'
      };

      const response = await request(app)
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${userToken}`)
        .send(vehicleData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Veículo cadastrado com sucesso');
      expect(response.body.data).toMatchObject({
        brand: 'Toyota',
        model: 'Corolla',
        year: 2022,
        plate: testPlate,
        color: 'Branco',
        current_km: 15000,
        is_active: true
      });

      testVehicleId = response.body.data.id;
    });

    test('Should fail to create vehicle without authentication', async () => {
      const response = await request(app)
        .post('/api/vehicles')
        .send({
          brand: 'Honda',
          model: 'Civic',
          year: 2021,
          plate: 'ABC1234'
        });

      expect(response.status).toBe(401);
    });

    test('Should fail with invalid data - missing required fields', async () => {
      const response = await request(app)
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          brand: 'Toyota'
          // Missing required fields
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('obrigatór');
    });

    test('Should fail with invalid year', async () => {
      const response = await request(app)
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          brand: 'Toyota',
          model: 'Corolla',
          year: 1800, // Invalid year
          plate: generateTestPlate()
        });

      expect(response.status).toBe(400);
      expect(response.body.details[0].message).toContain('Ano deve estar entre');
    });

    test('Should fail with invalid plate format', async () => {
      const response = await request(app)
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          brand: 'Toyota',
          model: 'Corolla',
          year: 2022,
          plate: 'INVALID' // Invalid format
        });

      expect(response.status).toBe(400);
      expect(response.body.details[0].message).toBe('Formato de placa inválido (use ABC1234 ou ABC1D23)');
    });

    test('Should fail with duplicate plate', async () => {
      const duplicatePlate = generateTestPlate();

      // Create first vehicle
      await request(app)
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          brand: 'Honda',
          model: 'Civic',
          year: 2021,
          plate: duplicatePlate
        });

      // Try to create with same plate
      const response = await request(app)
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          brand: 'Toyota',
          model: 'Corolla',
          year: 2022,
          plate: duplicatePlate
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Placa já cadastrada');
    });
  });

  describe('GET /api/vehicles', () => {
    test('Should list user vehicles successfully', async () => {
      const response = await request(app)
        .get('/api/vehicles')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.count).toBeDefined();
    });

    test('Should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/vehicles');

      expect(response.status).toBe(401);
    });

    test('Should only show active vehicles', async () => {
      const response = await request(app)
        .get('/api/vehicles')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      response.body.data.forEach(vehicle => {
        expect(vehicle.is_active).toBe(true);
      });
    });
  });

  describe('GET /api/vehicles/:id', () => {
    test('Should get specific vehicle successfully', async () => {
      const response = await request(app)
        .get(`/api/vehicles/${testVehicleId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testVehicleId);
      expect(response.body.data.brand).toBe('Toyota');
    });

    test('Should fail with invalid vehicle ID', async () => {
      const response = await request(app)
        .get('/api/vehicles/99999')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Veículo não encontrado');
    });

    test('Should fail with invalid ID format', async () => {
      const response = await request(app)
        .get('/api/vehicles/invalid')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(400);
      expect(response.body.details[0].message).toBe('ID do veículo inválido');
    });
  });

  describe('PUT /api/vehicles/:id', () => {
    test('Should update vehicle successfully', async () => {
      const newPlate = generateTestPlate();
      const updateData = {
        brand: 'Toyota',
        model: 'Corolla XEI',
        year: 2022,
        plate: newPlate,
        color: 'Prata',
        current_km: 18000,
        purchase_date: '2022-01-15',
        notes: 'Veículo atualizado'
      };

      const response = await request(app)
        .put(`/api/vehicles/${testVehicleId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Veículo atualizado com sucesso');
      expect(response.body.data.model).toBe('Corolla XEI');
      expect(response.body.data.color).toBe('Prata');
      expect(response.body.data.current_km).toBe(18000);
    });

    test('Should fail to update non-existent vehicle', async () => {
      const response = await request(app)
        .put('/api/vehicles/99999')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          brand: 'Toyota',
          model: 'Corolla',
          year: 2022,
          plate: generateTestPlate(),
          current_km: 15000
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Veículo não encontrado');
    });

    test('Should fail with invalid update data', async () => {
      const response = await request(app)
        .put(`/api/vehicles/${testVehicleId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          brand: '',
          model: 'Corolla',
          year: 2022,
          plate: generateTestPlate(),
          current_km: -100 // Invalid negative km
        });

      expect(response.status).toBe(400);
    });
  });

  describe('PATCH /api/vehicles/:id/inactivate', () => {
    test('Should inactivate vehicle successfully', async () => {
      const response = await request(app)
        .patch(`/api/vehicles/${testVehicleId}/inactivate`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Veículo inativado com sucesso');
      expect(response.body.data.is_active).toBe(false);
    });

    test('Should fail to inactivate already inactive vehicle', async () => {
      const response = await request(app)
        .patch(`/api/vehicles/${testVehicleId}/inactivate`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Veículo não encontrado');
    });
  });

  describe('GET /api/vehicles/inactive', () => {
    test('Should list inactive vehicles successfully', async () => {
      const response = await request(app)
        .get('/api/vehicles/inactive')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);

      // Should include our inactivated vehicle
      const inactiveVehicle = response.body.data.find(v => v.id === testVehicleId);
      expect(inactiveVehicle).toBeDefined();
      expect(inactiveVehicle.is_active).toBe(false);
    });
  });

  describe('PATCH /api/vehicles/:id/reactivate', () => {
    test('Should reactivate vehicle successfully', async () => {
      const response = await request(app)
        .patch(`/api/vehicles/${testVehicleId}/reactivate`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Veículo reativado com sucesso');
      expect(response.body.data.is_active).toBe(true);
    });

    test('Should fail to reactivate already active vehicle', async () => {
      const response = await request(app)
        .patch(`/api/vehicles/${testVehicleId}/reactivate`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Veículo não encontrado');
    });
  });

  describe('DELETE /api/vehicles/:id', () => {
    test('Should delete vehicle permanently', async () => {
      const response = await request(app)
        .delete(`/api/vehicles/${testVehicleId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Veículo excluído permanentemente');
    });

    test('Should fail to delete non-existent vehicle', async () => {
      const response = await request(app)
        .delete(`/api/vehicles/${testVehicleId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Veículo não encontrado');
    });
  });

  describe('Security - Cross-user access', () => {
    let otherUserVehicleId;

    beforeAll(async () => {
      // Create a vehicle for admin user
      const testPlate = generateTestPlate();
      const vehicleResponse = await request(app)
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          brand: 'Ford',
          model: 'Fiesta',
          year: 2020,
          plate: testPlate,
          current_km: 30000
        });

      otherUserVehicleId = vehicleResponse.body.data.id;
    });

    test('Should not access other user vehicle', async () => {
      const response = await request(app)
        .get(`/api/vehicles/${otherUserVehicleId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Veículo não encontrado');
    });

    test('Should not update other user vehicle', async () => {
      const response = await request(app)
        .put(`/api/vehicles/${otherUserVehicleId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          brand: 'Ford',
          model: 'Fiesta Hacked',
          year: 2020,
          plate: generateTestPlate(),
          current_km: 30000
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Veículo não encontrado');
    });

    test('Should not delete other user vehicle', async () => {
      const response = await request(app)
        .delete(`/api/vehicles/${otherUserVehicleId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Veículo não encontrado');
    });
  });

  describe('Validation edge cases', () => {
    test('Should handle minimum valid data', async () => {
      const testPlate = generateTestPlate();
      const response = await request(app)
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          brand: 'A',
          model: 'B',
          year: 1900,
          plate: testPlate
        });

      expect(response.status).toBe(201);
      expect(response.body.data.current_km).toBe(0); // Default value
    });

    test('Should handle maximum valid year', async () => {
      const currentYear = new Date().getFullYear();
      const response = await request(app)
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          brand: 'Future',
          model: 'Car',
          year: currentYear + 1,
          plate: generateTestPlate()
        });

      expect(response.status).toBe(201);
    });

    test('Should handle old format plate ABC1234', async () => {
      const testPlate = generateTestPlate('old');
      
      const response = await request(app)
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          brand: 'Volkswagen',
          model: 'Gol',
          year: 2010,
          plate: testPlate,
          current_km: 0
        });

      expect(response.status).toBe(201);
      expect(response.body.data.plate).toBe(testPlate);

      // Cleanup
      await pool.query('DELETE FROM vehicles WHERE id = $1', [response.body.data.id]);
    });

    test('Should handle new format plate ABC1D23', async () => {
      const testPlate = generateTestPlate('mercosul');
      
      const response = await request(app)
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          brand: 'Chevrolet',
          model: 'Onix',
          year: 2020,
          plate: testPlate,
          current_km: 0
        });

      expect(response.status).toBe(201);
      expect(response.body.data.plate).toBe(testPlate);

      // Cleanup
      await pool.query('DELETE FROM vehicles WHERE id = $1', [response.body.data.id]);
    });
  });

  describe('GET /api/vehicles/user/:userId (Admin Only)', () => {
    let regularUserId;
    let regularUserToken;
    let regularUserVehicleId;

    beforeAll(async () => {
      // Criar um usuário regular com veículos para testar
      const regularUsername = generateTestUsername('regularuser');
      const regularEmail = generateTestEmail('regularuser');

      const regularRegisterResponse = await request(app)
        .post('/api/users/register')
        .send({
          first_name: 'Regular',
          last_name: 'User',
          username: regularUsername,
          email: regularEmail,
          password: 'password123'
        });

      regularUserId = regularRegisterResponse.body.user.id;

      // Login do usuário regular
      const regularLoginResponse = await request(app)
        .post('/api/users/login')
        .send({
          login: regularUsername,
          password: 'password123'
        });
      regularUserToken = regularLoginResponse.body.token;

      // Criar um veículo para o usuário regular
      const vehicleResponse = await request(app)
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .send({
          brand: 'Honda',
          model: 'Civic',
          year: 2021,
          plate: generateTestPlate(),
          current_km: 25000
        });
      regularUserVehicleId = vehicleResponse.body.data.id;
    });

    afterAll(async () => {
      // Limpar dados do usuário regular
      await pool.query('DELETE FROM vehicles WHERE user_id = $1', [regularUserId]);
      await pool.query('DELETE FROM users WHERE id = $1', [regularUserId]);
    });

    test('Should allow admin to get user vehicles', async () => {
      const response = await request(app)
        .get(`/api/vehicles/user/${regularUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toMatchObject({
        id: regularUserId,
        name: 'Regular User',
        username: expect.stringContaining('regularuser')
      });
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.count).toBeGreaterThan(0);
      expect(response.body.data[0]).toMatchObject({
        brand: 'Honda',
        model: 'Civic',
        is_active: true
      });
    });

    test('Should allow admin to get user vehicles including inactive', async () => {
      // Primeiro, inativar o veículo
      await request(app)
        .patch(`/api/vehicles/${regularUserVehicleId}/inactivate`)
        .set('Authorization', `Bearer ${regularUserToken}`);

      const response = await request(app)
        .get(`/api/vehicles/user/${regularUserId}?include_inactive=true`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.some(v => !v.is_active)).toBe(true);
      expect(response.body.filters.include_inactive).toBe('true');

      // Reativar o veículo para outros testes
      await request(app)
        .patch(`/api/vehicles/${regularUserVehicleId}/reactivate`)
        .set('Authorization', `Bearer ${regularUserToken}`);
    });

    test('Should deny regular user access to other user vehicles', async () => {
      const response = await request(app)
        .get(`/api/vehicles/user/${userId}`)
        .set('Authorization', `Bearer ${regularUserToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Acesso negado');
    });

    test('Should fail with invalid user ID', async () => {
      const response = await request(app)
        .get('/api/vehicles/user/99999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Usuário não encontrado');
    });

    test('Should fail with invalid user ID format', async () => {
      const response = await request(app)
        .get('/api/vehicles/user/invalid')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
    });

    test('Should fail without authentication', async () => {
      const response = await request(app)
        .get(`/api/vehicles/user/${regularUserId}`);

      expect(response.status).toBe(401);
    });

    test('Should return empty array for user with no vehicles', async () => {
      // Criar usuário sem veículos
      const emptyUserUsername = generateTestUsername('emptyuser');
      const emptyUserEmail = generateTestEmail('emptyuser');

      const emptyUserRegisterResponse = await request(app)
        .post('/api/users/register')
        .send({
          first_name: 'Empty',
          last_name: 'User',
          username: emptyUserUsername,
          email: emptyUserEmail,
          password: 'password123'
        });

      const emptyUserId = emptyUserRegisterResponse.body.user.id;

      const response = await request(app)
        .get(`/api/vehicles/user/${emptyUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(response.body.count).toBe(0);

      // Cleanup
      await pool.query('DELETE FROM users WHERE id = $1', [emptyUserId]);
    });
  });
});