const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/database');
const { generateTestUsername, generateTestEmail, generateTestPlate } = require('./helpers/testUtils');

describe('Reminder Routes API', () => {
  let userId, adminId;
  let userToken, adminToken;
  let testVehicle, testReminder;

  beforeAll(async () => {
    // Criar usuário de teste
    const testUsername = generateTestUsername('reminderuser');
    const testEmail = generateTestEmail('reminderuser');

    const userResponse = await request(app)
      .post('/api/users/register')
      .send({
        username: testUsername,
        email: testEmail,
        password: 'Test@123',
        first_name: 'Reminder',
        last_name: 'Test'
      });

    if (!userResponse.body.user) {
      console.error('User registration failed:', userResponse.body);
      throw new Error('User registration failed');
    }

    userId = userResponse.body.user.id;
    userToken = userResponse.body.token;

    // Criar admin de teste
    const adminUsername = generateTestUsername('reminderadmin');
    const adminEmail = generateTestEmail('reminderadmin');

    const adminResponse = await request(app)
      .post('/api/users/register')
      .send({
        username: adminUsername,
        email: adminEmail,
        password: 'Admin@123',
        first_name: 'Admin',
        last_name: 'Reminder'
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
        current_km: 15000
      });

    if (!vehicleResponse.body.data) {
      console.error('Vehicle creation failed:', vehicleResponse.body);
      throw new Error('Vehicle creation failed');
    }

    testVehicle = vehicleResponse.body.data;
  });

  afterAll(async () => {
    // Limpar dados de teste
    await pool.query('DELETE FROM reminders WHERE vehicle_id = $1', [testVehicle.id]);
    await pool.query('DELETE FROM vehicles WHERE user_id IN ($1, $2)', [userId, adminId]);
    await pool.query('DELETE FROM users WHERE id IN ($1, $2)', [userId, adminId]);
    await pool.end();
  });

  describe('POST /api/reminders', () => {
    test('Should create reminder with km trigger successfully', async () => {
      const response = await request(app)
        .post('/api/reminders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          vehicle_id: testVehicle.id,
          type: 'maintenance',
          title: 'Troca de óleo',
          description: 'Trocar óleo do motor',
          remind_at_km: 20000,
          is_recurring: true,
          recurrence_km: 5000
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.title).toBe('Troca de óleo');
      expect(response.body.data.type).toBe('maintenance');
      expect(response.body.data.remind_at_km).toBe(20000);
      expect(response.body.data.is_recurring).toBe(true);
      expect(response.body.data.recurrence_km).toBe(5000);

      testReminder = response.body.data;
    });

    test('Should create reminder with date trigger successfully', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      const response = await request(app)
        .post('/api/reminders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          vehicle_id: testVehicle.id,
          type: 'insurance',
          title: 'Renovar seguro',
          remind_at_date: futureDateStr,
          is_recurring: true,
          recurrence_months: 12
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe('insurance');
      expect(response.body.data.is_recurring).toBe(true);
      expect(response.body.data.recurrence_months).toBe(12);
    });

    test('Should create reminder with both triggers', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 60);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      const response = await request(app)
        .post('/api/reminders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          vehicle_id: testVehicle.id,
          type: 'inspection',
          title: 'Inspeção veicular',
          remind_at_km: 25000,
          remind_at_date: futureDateStr
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.remind_at_km).toBe(25000);
      expect(response.body.data.remind_at_date).toBeTruthy();
    });

    test('Should fail without triggers', async () => {
      const response = await request(app)
        .post('/api/reminders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          vehicle_id: testVehicle.id,
          type: 'maintenance',
          title: 'Teste sem gatilho'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeTruthy();
    });

    test('Should fail with invalid type', async () => {
      const response = await request(app)
        .post('/api/reminders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          vehicle_id: testVehicle.id,
          type: 'invalid_type',
          title: 'Teste tipo inválido',
          remind_at_km: 30000
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeTruthy();
    });

    test('Should fail for non-existent vehicle', async () => {
      const response = await request(app)
        .post('/api/reminders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          vehicle_id: 999999,
          type: 'maintenance',
          title: 'Teste veículo inexistente',
          remind_at_km: 20000
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Veículo não encontrado');
    });

    test('Should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/reminders')
        .send({
          vehicle_id: testVehicle.id,
          type: 'maintenance',
          title: 'Teste sem auth',
          remind_at_km: 20000
        });

      expect(response.status).toBe(401);
    });

    test('Should fail with recurring but no interval', async () => {
      const response = await request(app)
        .post('/api/reminders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          vehicle_id: testVehicle.id,
          type: 'maintenance',
          title: 'Recorrente sem intervalo',
          remind_at_km: 20000,
          is_recurring: true
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeTruthy();
    });
  });

  describe('GET /api/reminders', () => {
    test('Should list reminders successfully', async () => {
      const response = await request(app)
        .get('/api/reminders')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.count).toBeGreaterThan(0);
    });

    test('Should filter reminders by status', async () => {
      const response = await request(app)
        .get('/api/reminders?status=pending')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.every(r => r.status === 'pending')).toBe(true);
    });

    test('Should filter reminders by type', async () => {
      const response = await request(app)
        .get('/api/reminders?type=maintenance')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.every(r => r.type === 'maintenance')).toBe(true);
    });

    test('Should filter reminders by vehicle', async () => {
      const response = await request(app)
        .get(`/api/reminders?vehicle_id=${testVehicle.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.every(r => r.vehicle_id === testVehicle.id)).toBe(true);
    });

    test('Should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/reminders');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/reminders/pending', () => {
    test('Should list pending reminders successfully', async () => {
      const response = await request(app)
        .get('/api/reminders/pending')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('Should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/reminders/pending');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/reminders/vehicle/:vehicleId', () => {
    test('Should list reminders by vehicle successfully', async () => {
      const response = await request(app)
        .get(`/api/reminders/vehicle/${testVehicle.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.every(r => r.vehicle_id === testVehicle.id)).toBe(true);
    });

    test('Should fail for non-existent vehicle', async () => {
      const response = await request(app)
        .get('/api/reminders/vehicle/999999')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Veículo não encontrado');
    });

    test('Should fail without authentication', async () => {
      const response = await request(app)
        .get(`/api/reminders/vehicle/${testVehicle.id}`);

      expect(response.status).toBe(401);
    });

    test('Should fail with invalid vehicle ID', async () => {
      const response = await request(app)
        .get('/api/reminders/vehicle/invalid')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBeTruthy();
    });
  });

  describe('GET /api/reminders/:id', () => {
    test('Should get reminder by ID successfully', async () => {
      const response = await request(app)
        .get(`/api/reminders/${testReminder.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testReminder.id);
      expect(response.body.data.title).toBe(testReminder.title);
    });

    test('Should fail for non-existent reminder', async () => {
      const response = await request(app)
        .get('/api/reminders/999999')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Lembrete não encontrado');
    });

    test('Should fail without authentication', async () => {
      const response = await request(app)
        .get(`/api/reminders/${testReminder.id}`);

      expect(response.status).toBe(401);
    });

    test('Should fail with invalid reminder ID', async () => {
      const response = await request(app)
        .get('/api/reminders/invalid')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBeTruthy();
    });
  });

  describe('PUT /api/reminders/:id', () => {
    test('Should update reminder successfully', async () => {
      const response = await request(app)
        .put(`/api/reminders/${testReminder.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Troca de óleo atualizada',
          remind_at_km: 22000
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Troca de óleo atualizada');
      expect(response.body.data.remind_at_km).toBe(22000);
    });

    test('Should fail for non-existent reminder', async () => {
      const response = await request(app)
        .put('/api/reminders/999999')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Update inexistente'
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Lembrete não encontrado');
    });

    test('Should fail without authentication', async () => {
      const response = await request(app)
        .put(`/api/reminders/${testReminder.id}`)
        .send({
          title: 'Update sem auth'
        });

      expect(response.status).toBe(401);
    });

    test('Should fail with invalid reminder ID', async () => {
      const response = await request(app)
        .put('/api/reminders/invalid')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Update ID inválido'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeTruthy();
    });
  });

  describe('PATCH /api/reminders/:id/complete', () => {
    test('Should mark reminder as completed successfully', async () => {
      const response = await request(app)
        .patch(`/api/reminders/${testReminder.id}/complete`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('completed');
      expect(response.body.data.completed_at).toBeTruthy();
    });

    test('Should fail for non-existent reminder', async () => {
      const response = await request(app)
        .patch('/api/reminders/999999/complete')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Lembrete não encontrado');
    });

    test('Should fail without authentication', async () => {
      const response = await request(app)
        .patch(`/api/reminders/${testReminder.id}/complete`);

      expect(response.status).toBe(401);
    });

    test('Should fail with invalid reminder ID', async () => {
      const response = await request(app)
        .patch('/api/reminders/invalid/complete')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBeTruthy();
    });
  });

  describe('PATCH /api/reminders/:id/dismiss', () => {
    let dismissReminder;

    beforeAll(async () => {
      // Criar lembrete para testar dismiss
      const response = await request(app)
        .post('/api/reminders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          vehicle_id: testVehicle.id,
          type: 'custom',
          title: 'Lembrete para descartar',
          remind_at_km: 30000
        });

      dismissReminder = response.body.data;
    });

    test('Should mark reminder as dismissed successfully', async () => {
      const response = await request(app)
        .patch(`/api/reminders/${dismissReminder.id}/dismiss`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('dismissed');
    });

    test('Should fail for non-existent reminder', async () => {
      const response = await request(app)
        .patch('/api/reminders/999999/dismiss')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Lembrete não encontrado');
    });

    test('Should fail without authentication', async () => {
      const response = await request(app)
        .patch(`/api/reminders/${dismissReminder.id}/dismiss`);

      expect(response.status).toBe(401);
    });

    test('Should fail with invalid reminder ID', async () => {
      const response = await request(app)
        .patch('/api/reminders/invalid/dismiss')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBeTruthy();
    });
  });

  describe('DELETE /api/reminders/:id', () => {
    let deleteReminder;

    beforeAll(async () => {
      // Criar lembrete para testar delete
      const response = await request(app)
        .post('/api/reminders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          vehicle_id: testVehicle.id,
          type: 'custom',
          title: 'Lembrete para deletar',
          remind_at_km: 35000
        });

      deleteReminder = response.body.data;
    });

    test('Should delete reminder successfully', async () => {
      const response = await request(app)
        .delete(`/api/reminders/${deleteReminder.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Lembrete excluído com sucesso');
    });

    test('Should fail for non-existent reminder', async () => {
      const response = await request(app)
        .delete('/api/reminders/999999')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Lembrete não encontrado');
    });

    test('Should fail without authentication', async () => {
      const response = await request(app)
        .delete('/api/reminders/1');

      expect(response.status).toBe(401);
    });

    test('Should fail with invalid reminder ID', async () => {
      const response = await request(app)
        .delete('/api/reminders/invalid')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBeTruthy();
    });
  });

  describe('Authorization Tests', () => {
    let otherUserVehicle, otherUserReminder;

    beforeAll(async () => {
      // Criar veículo e lembrete com admin para testes de autorização
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

      const reminderResponse = await request(app)
        .post('/api/reminders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          vehicle_id: otherUserVehicle.id,
          type: 'maintenance',
          title: 'Lembrete do admin',
          remind_at_km: 15000
        });

      otherUserReminder = reminderResponse.body.data;
    });

    test('Should not access other user reminder', async () => {
      const response = await request(app)
        .get(`/api/reminders/${otherUserReminder.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Lembrete não encontrado');
    });

    test('Should not update other user reminder', async () => {
      const response = await request(app)
        .put(`/api/reminders/${otherUserReminder.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Tentativa de update'
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Lembrete não encontrado');
    });

    test('Should not delete other user reminder', async () => {
      const response = await request(app)
        .delete(`/api/reminders/${otherUserReminder.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Lembrete não encontrado');
    });

    test('Should not mark other user reminder as completed', async () => {
      const response = await request(app)
        .patch(`/api/reminders/${otherUserReminder.id}/complete`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Lembrete não encontrado');
    });
  });
});
