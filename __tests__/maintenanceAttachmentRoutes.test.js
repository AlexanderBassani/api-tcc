const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/database');
const path = require('path');
const fs = require('fs').promises;
const { generateTestUsername, generateTestEmail, generateTestPlate } = require('./helpers/testUtils');

describe('Maintenance Attachment Routes', () => {
  let adminToken, userToken, regularUserToken;
  let adminUser, regularUser;
  let testVehicle, testMaintenance;
  let testAttachmentIds = [];
  let testMaintenanceId;
  let otherUserVehicle, otherUserMaintenance;

  beforeAll(async () => {
    // Create maintenance_attachments table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS maintenance_attachments (
        id SERIAL PRIMARY KEY,
        maintenance_id INTEGER NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_type VARCHAR(50) NOT NULL,
        file_size INTEGER NOT NULL CHECK (file_size > 0),
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_maintenance_attachments_maintenance
          FOREIGN KEY (maintenance_id)
          REFERENCES maintenances(id)
          ON DELETE CASCADE
      );
    `);

    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash('testpass123', 10);

    // Criar usuário admin diretamente no banco
    const adminUsername = generateTestUsername('admin');
    const adminEmail = generateTestEmail('admin');
    
    const adminResult = await pool.query(
      `INSERT INTO users (first_name, last_name, username, email, password_hash, role, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
      ['Admin', 'Test', adminUsername, adminEmail, hashedPassword, 'admin', 'active']
    );
    adminUser = adminResult.rows[0];

    // Login admin
    const adminLoginResponse = await request(app)
      .post('/api/users/login')
      .send({
        login: adminUsername,
        password: 'testpass123'
      });
    
    if (!adminLoginResponse.body.token) {
      console.error('Admin login failed:', adminLoginResponse.body);
      throw new Error('Admin login failed');
    }
    adminToken = adminLoginResponse.body.token;

    // Criar usuário regular diretamente no banco
    const regularUsername = generateTestUsername('regular');
    const regularEmail = generateTestEmail('regular');
    
    const regularResult = await pool.query(
      `INSERT INTO users (first_name, last_name, username, email, password_hash, role, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
      ['Regular', 'User', regularUsername, regularEmail, hashedPassword, 'user', 'active']
    );
    regularUser = regularResult.rows[0];

    // Login usuário regular
    const regularLoginResponse = await request(app)
      .post('/api/users/login')
      .send({
        login: regularUsername,
        password: 'testpass123'
      });
    
    if (!regularLoginResponse.body.token) {
      console.error('Regular user login failed:', regularLoginResponse.body);
      throw new Error('Regular user login failed');
    }
    userToken = regularUserToken = regularLoginResponse.body.token;

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

    // Criar manutenção de teste
    const maintenanceResponse = await request(app)
      .post('/api/maintenances')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        vehicle_id: testVehicle.id,
        type: 'Manutenção para teste de anexos',
        description: 'Manutenção de teste para anexos',
        cost: 150.50,
        service_date: '2024-01-15',
        km_at_service: 15000
      });

    if (!maintenanceResponse.body.data) {
      console.error('Maintenance creation failed:', maintenanceResponse.body);
      throw new Error('Maintenance creation failed');
    }
    testMaintenance = maintenanceResponse.body.data;
    testMaintenanceId = testMaintenance.id;

    // Criar veículo de outro usuário (admin) para testes de autorização
    const otherPlate = generateTestPlate('mercosul');
    const otherVehicleResponse = await request(app)
      .post('/api/vehicles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        brand: 'Honda',
        model: 'Civic',
        year: 2021,
        plate: otherPlate,
        color: 'Preto',
        current_km: 8000
      });

    if (!otherVehicleResponse.body.data) {
      console.error('Other user vehicle creation failed:', otherVehicleResponse.body);
      throw new Error('Other user vehicle creation failed');
    }
    otherUserVehicle = otherVehicleResponse.body.data;

    // Criar manutenção de outro usuário
    const otherMaintenanceResponse = await request(app)
      .post('/api/maintenances')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        vehicle_id: otherUserVehicle.id,
        type: 'Manutenção de outro usuário',
        description: 'Manutenção de outro usuário',
        cost: 200.00,
        service_date: '2024-01-20',
        km_at_service: 8000
      });

    if (!otherMaintenanceResponse.body.data) {
      console.error('Other user maintenance creation failed:', otherMaintenanceResponse.body);
      throw new Error('Other user maintenance creation failed');
    }
    otherUserMaintenance = otherMaintenanceResponse.body.data;

    // Criar diretório de uploads para testes com permissões adequadas
    const uploadDir = path.join(__dirname, '../uploads/maintenance-attachments');
    await fs.mkdir(uploadDir, { recursive: true });
    
    // Criar arquivo de teste simples no diretório de testes
    const testFilePath = path.join(__dirname, 'test-file.txt');
    await fs.writeFile(testFilePath, 'Este é um arquivo de teste para upload');
  });

  afterAll(async () => {
    // Limpar dados de teste
    try {
      // Limpar anexos
      if (testAttachmentIds.length > 0) {
        await pool.query('DELETE FROM maintenance_attachments WHERE id = ANY($1)', [testAttachmentIds]);
      }

      // Limpar manutenções
      await pool.query('DELETE FROM maintenances WHERE id = $1 OR id = $2', [testMaintenance?.id, otherUserMaintenance?.id]);

      // Limpar veículos
      await pool.query('DELETE FROM vehicles WHERE id = $1 OR id = $2', [testVehicle?.id, otherUserVehicle?.id]);

      // Limpar usuários
      await pool.query('DELETE FROM users WHERE id = $1 OR id = $2', [adminUser?.id, regularUser?.id]);

      // Limpar arquivo de teste
      const testFilePath = path.join(__dirname, 'test-file.txt');
      await fs.unlink(testFilePath).catch(() => {});

      // Limpar diretório de uploads de teste
      const uploadDir = path.join(__dirname, '../uploads/maintenance-attachments');
      try {
        const files = await fs.readdir(uploadDir);
        await Promise.all(files.map(file => 
          fs.unlink(path.join(uploadDir, file)).catch(() => {})
        ));
      } catch (error) {
        // Diretório pode não existir
      }
    } catch (error) {
      console.error('Error in cleanup:', error);
    }
  });

  describe('POST /api/maintenance-attachments/maintenance/:maintenanceId/upload', () => {
    test('Should upload file successfully', async () => {
      const testFilePath = path.join(__dirname, 'test-file.txt');
      
      const response = await request(app)
        .post(`/api/maintenance-attachments/maintenance/${testMaintenanceId}/upload`)
        .set('Authorization', `Bearer ${userToken}`)
        .attach('files', testFilePath);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].file_name).toBe('test-file.txt');
      expect(response.body.data[0].file_type).toBe('text/plain');
      expect(response.body.data[0].maintenance_id).toBe(testMaintenanceId);

      testAttachmentIds.push(response.body.data[0].id);
    });

    test('Should fail without files', async () => {
      const response = await request(app)
        .post(`/api/maintenance-attachments/maintenance/${testMaintenanceId}/upload`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Nenhum arquivo fornecido');
    });

    test('Should fail for non-existent maintenance', async () => {
      const testFilePath = path.join(__dirname, 'test-file.txt');
      
      const response = await request(app)
        .post('/api/maintenance-attachments/maintenance/99999/upload')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('files', testFilePath);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Manutenção não encontrada');
    });

    test('Should fail for maintenance of other user', async () => {
      const testFilePath = path.join(__dirname, 'test-file.txt');
      
      const response = await request(app)
        .post(`/api/maintenance-attachments/maintenance/${otherUserMaintenance.id}/upload`)
        .set('Authorization', `Bearer ${userToken}`)
        .attach('files', testFilePath);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Manutenção não encontrada');
    });

    test('Should fail without authentication', async () => {
      const testFilePath = path.join(__dirname, 'test-file.txt');
      
      const response = await request(app)
        .post(`/api/maintenance-attachments/maintenance/${testMaintenanceId}/upload`)
        .attach('files', testFilePath);

      expect(response.status).toBe(401);
    });

    test('Should fail with invalid maintenance ID', async () => {
      const testFilePath = path.join(__dirname, 'test-file.txt');
      
      const response = await request(app)
        .post('/api/maintenance-attachments/maintenance/invalid/upload')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('files', testFilePath);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ID da manutenção inválido');
    });
  });

  describe('GET /api/maintenance-attachments/maintenance/:maintenanceId', () => {
    test('Should list attachments successfully', async () => {
      const response = await request(app)
        .get(`/api/maintenance-attachments/maintenance/${testMaintenanceId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.count).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('Should fail for non-existent maintenance', async () => {
      const response = await request(app)
        .get('/api/maintenance-attachments/maintenance/99999')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Manutenção não encontrada');
    });

    test('Should fail for maintenance of other user', async () => {
      const response = await request(app)
        .get(`/api/maintenance-attachments/maintenance/${otherUserMaintenance.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Manutenção não encontrada');
    });

    test('Should fail without authentication', async () => {
      const response = await request(app)
        .get(`/api/maintenance-attachments/maintenance/${testMaintenanceId}`);

      expect(response.status).toBe(401);
    });

    test('Should fail with invalid maintenance ID', async () => {
      const response = await request(app)
        .get('/api/maintenance-attachments/maintenance/invalid')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ID da manutenção inválido');
    });
  });

  describe('GET /api/maintenance-attachments/:id', () => {
    let attachmentId;

    beforeAll(async () => {
      // Criar anexo para testes de busca individual
      const testFilePath = path.join(__dirname, 'test-file.txt');
      
      const uploadResponse = await request(app)
        .post(`/api/maintenance-attachments/maintenance/${testMaintenanceId}/upload`)
        .set('Authorization', `Bearer ${userToken}`)
        .attach('files', testFilePath);

      attachmentId = uploadResponse.body.data[0].id;
      testAttachmentIds.push(attachmentId);
    });

    test('Should get attachment by ID successfully', async () => {
      const response = await request(app)
        .get(`/api/maintenance-attachments/${attachmentId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(attachmentId);
      expect(response.body.data.file_name).toBe('test-file.txt');
      expect(response.body.data.maintenance_id).toBe(testMaintenanceId);
    });

    test('Should fail for non-existent attachment', async () => {
      const response = await request(app)
        .get('/api/maintenance-attachments/99999')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Anexo não encontrado');
    });

    test('Should fail without authentication', async () => {
      const response = await request(app)
        .get(`/api/maintenance-attachments/${attachmentId}`);

      expect(response.status).toBe(401);
    });

    test('Should fail with invalid attachment ID', async () => {
      const response = await request(app)
        .get('/api/maintenance-attachments/invalid')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ID do anexo inválido');
    });
  });

  describe('PUT /api/maintenance-attachments/:id', () => {
    let attachmentId;

    beforeAll(async () => {
      // Criar anexo para testes de atualização
      const testFilePath = path.join(__dirname, 'test-file.txt');
      
      const uploadResponse = await request(app)
        .post(`/api/maintenance-attachments/maintenance/${testMaintenanceId}/upload`)
        .set('Authorization', `Bearer ${userToken}`)
        .attach('files', testFilePath);

      attachmentId = uploadResponse.body.data[0].id;
      testAttachmentIds.push(attachmentId);
    });

    test('Should update attachment name successfully', async () => {
      const newFileName = 'Arquivo Renomeado.txt';
      
      const response = await request(app)
        .put(`/api/maintenance-attachments/${attachmentId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          file_name: newFileName
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.file_name).toBe(newFileName);
      expect(response.body.data.id).toBe(attachmentId);
    });

    test('Should fail without file_name', async () => {
      const response = await request(app)
        .put(`/api/maintenance-attachments/${attachmentId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Nome do arquivo é obrigatório');
    });

    test('Should fail with empty file_name', async () => {
      const response = await request(app)
        .put(`/api/maintenance-attachments/${attachmentId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          file_name: '   '
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Nome do arquivo é obrigatório');
    });

    test('Should fail for non-existent attachment', async () => {
      const response = await request(app)
        .put('/api/maintenance-attachments/99999')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          file_name: 'Novo Nome.txt'
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Anexo não encontrado');
    });

    test('Should fail without authentication', async () => {
      const response = await request(app)
        .put(`/api/maintenance-attachments/${attachmentId}`)
        .send({
          file_name: 'Novo Nome.txt'
        });

      expect(response.status).toBe(401);
    });

    test('Should fail with invalid attachment ID', async () => {
      const response = await request(app)
        .put('/api/maintenance-attachments/invalid')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          file_name: 'Novo Nome.txt'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ID do anexo inválido');
    });
  });

  describe('GET /api/maintenance-attachments/:id/download', () => {
    let attachmentId;

    beforeAll(async () => {
      // Criar anexo para testes de download
      const testFilePath = path.join(__dirname, 'test-file.txt');
      
      const uploadResponse = await request(app)
        .post(`/api/maintenance-attachments/maintenance/${testMaintenanceId}/upload`)
        .set('Authorization', `Bearer ${userToken}`)
        .attach('files', testFilePath);

      attachmentId = uploadResponse.body.data[0].id;
      testAttachmentIds.push(attachmentId);
    });

    test('Should download attachment successfully', async () => {
      const response = await request(app)
        .get(`/api/maintenance-attachments/${attachmentId}/download`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('test-file.txt');
      expect(response.headers['content-type']).toBe('text/plain');
    });

    test('Should fail for non-existent attachment', async () => {
      const response = await request(app)
        .get('/api/maintenance-attachments/99999/download')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Anexo não encontrado');
    });

    test('Should fail without authentication', async () => {
      const response = await request(app)
        .get(`/api/maintenance-attachments/${attachmentId}/download`);

      expect(response.status).toBe(401);
    });

    test('Should fail with invalid attachment ID', async () => {
      const response = await request(app)
        .get('/api/maintenance-attachments/invalid/download')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ID do anexo inválido');
    });
  });

  describe('DELETE /api/maintenance-attachments/:id', () => {
    let attachmentId;

    beforeAll(async () => {
      // Criar anexo para testes de exclusão
      const testFilePath = path.join(__dirname, 'test-file.txt');
      
      const uploadResponse = await request(app)
        .post(`/api/maintenance-attachments/maintenance/${testMaintenanceId}/upload`)
        .set('Authorization', `Bearer ${userToken}`)
        .attach('files', testFilePath);

      attachmentId = uploadResponse.body.data[0].id;
      // Não adicionar ao testAttachmentIds pois será deletado no teste
    });

    test('Should delete attachment successfully', async () => {
      const response = await request(app)
        .delete(`/api/maintenance-attachments/${attachmentId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Anexo excluído com sucesso');

      // Verificar se anexo foi realmente removido
      const checkResponse = await request(app)
        .get(`/api/maintenance-attachments/${attachmentId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(checkResponse.status).toBe(404);
    });

    test('Should fail for non-existent attachment', async () => {
      const response = await request(app)
        .delete('/api/maintenance-attachments/99999')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Anexo não encontrado');
    });

    test('Should fail without authentication', async () => {
      const response = await request(app)
        .delete('/api/maintenance-attachments/99999');

      expect(response.status).toBe(401);
    });

    test('Should fail with invalid attachment ID', async () => {
      const response = await request(app)
        .delete('/api/maintenance-attachments/invalid')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ID do anexo inválido');
    });
  });

  describe('File Type Validation', () => {
    test('Should reject unsupported file types', async () => {
      // Criar arquivo com tipo não suportado
      const executableFile = path.join(__dirname, 'test-executable.exe');
      await fs.writeFile(executableFile, 'fake executable content');

      const response = await request(app)
        .post(`/api/maintenance-attachments/maintenance/${testMaintenanceId}/upload`)
        .set('Authorization', `Bearer ${userToken}`)
        .attach('files', executableFile);

      // Deve falhar devido ao filtro de tipos de arquivo
      expect(response.status).toBe(500);

      // Limpar arquivo de teste
      await fs.unlink(executableFile).catch(() => {});
    });
  });

  describe('Authorization Tests', () => {
    let otherUserAttachmentId;

    beforeAll(async () => {
      // Criar anexo com usuário admin para teste de autorização
      const testFilePath = path.join(__dirname, 'test-file.txt');
      
      const uploadResponse = await request(app)
        .post(`/api/maintenance-attachments/maintenance/${otherUserMaintenance.id}/upload`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('files', testFilePath);

      otherUserAttachmentId = uploadResponse.body.data[0].id;
    });

    afterAll(async () => {
      // Limpar anexo do outro usuário
      if (otherUserAttachmentId) {
        await pool.query('DELETE FROM maintenance_attachments WHERE id = $1', [otherUserAttachmentId]);
      }
    });

    test('Should not access other user attachments', async () => {
      const response = await request(app)
        .get(`/api/maintenance-attachments/${otherUserAttachmentId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Anexo não encontrado');
    });

    test('Should not update other user attachments', async () => {
      const response = await request(app)
        .put(`/api/maintenance-attachments/${otherUserAttachmentId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          file_name: 'Tentativa de hack.txt'
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Anexo não encontrado');
    });

    test('Should not delete other user attachments', async () => {
      const response = await request(app)
        .delete(`/api/maintenance-attachments/${otherUserAttachmentId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Anexo não encontrado');
    });

    test('Should not download other user attachments', async () => {
      const response = await request(app)
        .get(`/api/maintenance-attachments/${otherUserAttachmentId}/download`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Anexo não encontrado');
    });
  });
});