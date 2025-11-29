const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/database');
const { generateTestUsername, generateTestEmail, generateTestPlate } = require('./helpers/testUtils');

describe('Fuel Record Routes API', () => {
  let userId, adminId;
  let userToken, adminToken;
  let testVehicle, testFuelRecord;

  beforeAll(async () => {
    // Criar usuário de teste
    const testUsername = generateTestUsername('fueluser');
    const testEmail = generateTestEmail('fueluser');

    const userResponse = await request(app)
      .post('/api/users/register')
      .send({
        username: testUsername,
        email: testEmail,
        password: 'Test@123',
        first_name: 'Fuel',
        last_name: 'Test'
      });

    if (!userResponse.body.user) {
      console.error('User registration failed:', userResponse.body);
      throw new Error('User registration failed');
    }

    userId = userResponse.body.user.id;
    userToken = userResponse.body.token;

    // Criar admin de teste
    const adminUsername = generateTestUsername('fueladmin');
    const adminEmail = generateTestEmail('fueladmin');

    const adminResponse = await request(app)
      .post('/api/users/register')
      .send({
        username: adminUsername,
        email: adminEmail,
        password: 'Admin@123',
        first_name: 'Admin',
        last_name: 'Fuel'
      });

    if (!adminResponse.body.user) {
      console.error('Admin registration failed:', adminResponse.body);
      throw new Error('Admin registration failed');
    }

    adminId = adminResponse.body.user.id;
    adminToken = adminResponse.body.token;

    // Criar veículo de teste
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
        current_km: 10000
      });

    if (!vehicleResponse.body.data) {
      console.error('Vehicle creation failed:', vehicleResponse.body);
      throw new Error('Vehicle creation failed');
    }

    testVehicle = vehicleResponse.body.data;
  });

  afterAll(async () => {
    // Limpar dados de teste
    if (testVehicle) {
      await pool.query('DELETE FROM fuel_records WHERE vehicle_id = $1', [testVehicle.id]);
      await pool.query('DELETE FROM vehicles WHERE id = $1', [testVehicle.id]);
    }
    await pool.query('DELETE FROM users WHERE id IN ($1, $2)', [userId, adminId]);
    await pool.end();
  });

  describe('POST /api/fuel-records', () => {
    test('Should create fuel record successfully', async () => {
      const today = new Date().toISOString().split('T')[0];

      const response = await request(app)
        .post('/api/fuel-records')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          vehicle_id: testVehicle.id,
          date: today,
          km: 15000,
          liters: 40.5,
          price_per_liter: 5.75,
          fuel_type: 'gasoline',
          is_full_tank: true,
          gas_station: 'Posto Shell',
          notes: 'Primeiro abastecimento'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.km).toBe(15000);
      expect(parseFloat(response.body.data.liters)).toBe(40.5);
      expect(parseFloat(response.body.data.price_per_liter)).toBe(5.75);
      expect(parseFloat(response.body.data.total_cost)).toBeCloseTo(232.88, 2);
      expect(response.body.data.fuel_type).toBe('gasoline');
      expect(response.body.data.is_full_tank).toBe(true);

      testFuelRecord = response.body.data;
    });

    test('Should create fuel record with ethanol', async () => {
      const today = new Date().toISOString().split('T')[0];

      const response = await request(app)
        .post('/api/fuel-records')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          vehicle_id: testVehicle.id,
          date: today,
          km: 15500,
          liters: 35.0,
          price_per_liter: 4.50,
          fuel_type: 'ethanol',
          is_full_tank: false
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.fuel_type).toBe('ethanol');
      expect(parseFloat(response.body.data.total_cost)).toBeCloseTo(157.50, 2);
    });

    test('Should fail with future date', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      const response = await request(app)
        .post('/api/fuel-records')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          vehicle_id: testVehicle.id,
          date: futureDateStr,
          km: 16000,
          liters: 40.0,
          price_per_liter: 5.50
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeTruthy();
    });

    test('Should fail with invalid fuel type', async () => {
      const today = new Date().toISOString().split('T')[0];

      const response = await request(app)
        .post('/api/fuel-records')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          vehicle_id: testVehicle.id,
          date: today,
          km: 16000,
          liters: 40.0,
          price_per_liter: 5.50,
          fuel_type: 'invalid_fuel'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeTruthy();
    });

    test('Should fail with zero liters', async () => {
      const today = new Date().toISOString().split('T')[0];

      const response = await request(app)
        .post('/api/fuel-records')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          vehicle_id: testVehicle.id,
          date: today,
          km: 16000,
          liters: 0,
          price_per_liter: 5.50
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeTruthy();
    });

    test('Should fail for non-existent vehicle', async () => {
      const today = new Date().toISOString().split('T')[0];

      const response = await request(app)
        .post('/api/fuel-records')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          vehicle_id: 999999,
          date: today,
          km: 16000,
          liters: 40.0,
          price_per_liter: 5.50
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Veículo não encontrado');
    });

    test('Should fail without authentication', async () => {
      const today = new Date().toISOString().split('T')[0];

      const response = await request(app)
        .post('/api/fuel-records')
        .send({
          vehicle_id: testVehicle.id,
          date: today,
          km: 16000,
          liters: 40.0,
          price_per_liter: 5.50
        });

      expect(response.status).toBe(401);
    });

    test('Should fail with negative km', async () => {
      const today = new Date().toISOString().split('T')[0];

      const response = await request(app)
        .post('/api/fuel-records')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          vehicle_id: testVehicle.id,
          date: today,
          km: -100,
          liters: 40.0,
          price_per_liter: 5.50
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeTruthy();
    });
  });

  describe('GET /api/fuel-records', () => {
    test('Should list fuel records successfully', async () => {
      const response = await request(app)
        .get('/api/fuel-records')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.count).toBeGreaterThan(0);
    });

    test('Should filter fuel records by vehicle', async () => {
      const response = await request(app)
        .get(`/api/fuel-records?vehicle_id=${testVehicle.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.every(r => r.vehicle_id === testVehicle.id)).toBe(true);
    });

    test('Should filter fuel records by fuel type', async () => {
      const response = await request(app)
        .get('/api/fuel-records?fuel_type=gasoline')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      if (response.body.data.length > 0) {
        expect(response.body.data.every(r => r.fuel_type === 'gasoline')).toBe(true);
      }
    });

    test('Should filter fuel records by date range', async () => {
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - 7);
      const endDate = today;

      const response = await request(app)
        .get(`/api/fuel-records?start_date=${startDate.toISOString().split('T')[0]}&end_date=${endDate.toISOString().split('T')[0]}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('Should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/fuel-records');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/fuel-records/vehicle/:vehicleId', () => {
    test('Should list fuel records by vehicle successfully', async () => {
      const response = await request(app)
        .get(`/api/fuel-records/vehicle/${testVehicle.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.every(r => r.vehicle_id === testVehicle.id)).toBe(true);
    });

    test('Should fail for non-existent vehicle', async () => {
      const response = await request(app)
        .get('/api/fuel-records/vehicle/999999')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Veículo não encontrado');
    });

    test('Should fail without authentication', async () => {
      const response = await request(app)
        .get(`/api/fuel-records/vehicle/${testVehicle.id}`);

      expect(response.status).toBe(401);
    });

    test('Should fail with invalid vehicle ID', async () => {
      const response = await request(app)
        .get('/api/fuel-records/vehicle/invalid')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBeTruthy();
    });
  });

  describe('GET /api/fuel-records/vehicle/:vehicleId/statistics', () => {
    test('Should get fuel statistics successfully', async () => {
      const response = await request(app)
        .get(`/api/fuel-records/vehicle/${testVehicle.id}/statistics`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('vehicle');
      expect(response.body.data).toHaveProperty('overview');
      expect(response.body.data).toHaveProperty('consumption');
      expect(response.body.data).toHaveProperty('by_fuel_type');
      expect(response.body.data.overview).toHaveProperty('total_records');
      expect(response.body.data.overview).toHaveProperty('total_liters');
      expect(response.body.data.overview).toHaveProperty('total_spent');
    });

    test('Should fail for non-existent vehicle', async () => {
      const response = await request(app)
        .get('/api/fuel-records/vehicle/999999/statistics')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Veículo não encontrado');
    });

    test('Should fail without authentication', async () => {
      const response = await request(app)
        .get(`/api/fuel-records/vehicle/${testVehicle.id}/statistics`);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/fuel-records/:id', () => {
    test('Should get fuel record by ID successfully', async () => {
      const response = await request(app)
        .get(`/api/fuel-records/${testFuelRecord.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testFuelRecord.id);
      expect(response.body.data.km).toBe(testFuelRecord.km);
    });

    test('Should fail for non-existent fuel record', async () => {
      const response = await request(app)
        .get('/api/fuel-records/999999')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Registro não encontrado');
    });

    test('Should fail without authentication', async () => {
      const response = await request(app)
        .get(`/api/fuel-records/${testFuelRecord.id}`);

      expect(response.status).toBe(401);
    });

    test('Should fail with invalid fuel record ID', async () => {
      const response = await request(app)
        .get('/api/fuel-records/invalid')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBeTruthy();
    });
  });

  describe('PUT /api/fuel-records/:id', () => {
    let updateTestRecord;

    beforeAll(async () => {
      // Criar um registro específico para testes de UPDATE com km maior que todos os outros
      const today = new Date().toISOString().split('T')[0];
      const response = await request(app)
        .post('/api/fuel-records')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          vehicle_id: testVehicle.id,
          date: today,
          km: 16000,
          liters: 40.0,
          price_per_liter: 5.50,
          fuel_type: 'gasoline',
          is_full_tank: true
        });
      updateTestRecord = response.body.data;
    });

    test('Should update fuel record successfully', async () => {
      const response = await request(app)
        .put(`/api/fuel-records/${updateTestRecord.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          gas_station: 'Posto Ipiranga',
          notes: 'Abastecimento atualizado'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.km).toBe(16000); // km não mudou
      expect(response.body.data.gas_station).toBe('Posto Ipiranga');
      expect(response.body.data.notes).toBe('Abastecimento atualizado');
    });

    test('Should update liters and recalculate total', async () => {
      const response = await request(app)
        .put(`/api/fuel-records/${updateTestRecord.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          liters: 45.0,
          price_per_liter: 6.00
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(parseFloat(response.body.data.liters)).toBe(45.0);
      expect(parseFloat(response.body.data.price_per_liter)).toBe(6.00);
      expect(parseFloat(response.body.data.total_cost)).toBeCloseTo(270.00, 2);
    });

    test('Should fail for non-existent fuel record', async () => {
      const response = await request(app)
        .put('/api/fuel-records/999999')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          km: 16000
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Registro não encontrado');
    });

    test('Should fail without authentication', async () => {
      const response = await request(app)
        .put(`/api/fuel-records/${testFuelRecord.id}`)
        .send({
          km: 16000
        });

      expect(response.status).toBe(401);
    });

    test('Should fail with invalid fuel record ID', async () => {
      const response = await request(app)
        .put('/api/fuel-records/invalid')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          km: 16000
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeTruthy();
    });
  });

  describe('DELETE /api/fuel-records/:id', () => {
    let deleteRecord;

    beforeAll(async () => {
      // Criar registro para deletar
      const today = new Date().toISOString().split('T')[0];
      const response = await request(app)
        .post('/api/fuel-records')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          vehicle_id: testVehicle.id,
          date: today,
          km: 16000,
          liters: 30.0,
          price_per_liter: 5.50
        });

      deleteRecord = response.body.data;
    });

    test('Should delete fuel record successfully', async () => {
      const response = await request(app)
        .delete(`/api/fuel-records/${deleteRecord.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Registro de abastecimento excluído com sucesso');
    });

    test('Should fail for non-existent fuel record', async () => {
      const response = await request(app)
        .delete('/api/fuel-records/999999')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Registro não encontrado');
    });

    test('Should fail without authentication', async () => {
      const response = await request(app)
        .delete('/api/fuel-records/1');

      expect(response.status).toBe(401);
    });

    test('Should fail with invalid fuel record ID', async () => {
      const response = await request(app)
        .delete('/api/fuel-records/invalid')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBeTruthy();
    });
  });

  describe('Authorization Tests', () => {
    let otherUserVehicle, otherUserFuelRecord;

    beforeAll(async () => {
      // Criar veículo e registro com admin
      const adminPlate = generateTestPlate('mercosul');
      const vehicleResponse = await request(app)
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          brand: 'Honda',
          model: 'Civic',
          year: 2021,
          plate: adminPlate,
          color: 'Preto',
          current_km: 8000
        });

      otherUserVehicle = vehicleResponse.body.data;

      const today = new Date().toISOString().split('T')[0];
      const fuelResponse = await request(app)
        .post('/api/fuel-records')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          vehicle_id: otherUserVehicle.id,
          date: today,
          km: 9000,
          liters: 35.0,
          price_per_liter: 5.80
        });

      otherUserFuelRecord = fuelResponse.body.data;
    });

    test('Should not access other user fuel record', async () => {
      const response = await request(app)
        .get(`/api/fuel-records/${otherUserFuelRecord.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Registro não encontrado');
    });

    test('Should not update other user fuel record', async () => {
      const response = await request(app)
        .put(`/api/fuel-records/${otherUserFuelRecord.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          km: 10000
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Registro não encontrado');
    });

    test('Should not delete other user fuel record', async () => {
      const response = await request(app)
        .delete(`/api/fuel-records/${otherUserFuelRecord.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Registro não encontrado');
    });
  });
});
