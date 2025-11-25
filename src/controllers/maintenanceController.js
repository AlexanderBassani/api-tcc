const pool = require('../config/database');
const logger = require('../config/logger');

// Listar todas as manutenções dos veículos do usuário autenticado
const getUserMaintenances = async (req, res) => {
  try {
    const userId = req.user.id;
    const { vehicle_id, type, limit = 50, offset = 0 } = req.query;
    
    let query = `
      SELECT 
        m.id, m.vehicle_id, m.service_provider_id, m.type, m.description, 
        m.cost, m.km_at_service, m.service_date, m.next_service_km, 
        m.next_service_date, m.invoice_number, m.warranty_until,
        m.created_at, m.updated_at,
        v.brand, v.model, v.year, v.plate,
        sp.name as service_provider_name, sp.phone as service_provider_phone
      FROM maintenances m
      INNER JOIN vehicles v ON m.vehicle_id = v.id
      LEFT JOIN service_providers sp ON m.service_provider_id = sp.id
      WHERE v.user_id = $1
    `;
    
    const queryParams = [userId];
    let paramCount = 1;
    
    // Filtro por veículo
    if (vehicle_id) {
      paramCount++;
      query += ` AND m.vehicle_id = $${paramCount}`;
      queryParams.push(vehicle_id);
    }
    
    // Filtro por tipo de manutenção
    if (type) {
      paramCount++;
      query += ` AND m.type ILIKE $${paramCount}`;
      queryParams.push(`%${type}%`);
    }
    
    query += ` ORDER BY m.service_date DESC, m.created_at DESC`;
    
    // Paginação
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    queryParams.push(parseInt(limit));
    
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    queryParams.push(parseInt(offset));
    
    const result = await pool.query(query, queryParams);
    
    logger.info('User maintenances retrieved', { 
      userId, 
      maintenanceCount: result.rows.length,
      filters: { vehicle_id, type, limit, offset }
    });
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    logger.error('Error retrieving user maintenances', {
      userId: req.user.id,
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível buscar as manutenções'
    });
  }
};

// Buscar uma manutenção específica do usuário
const getMaintenanceById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const result = await pool.query(
      `SELECT 
        m.id, m.vehicle_id, m.service_provider_id, m.type, m.description, 
        m.cost, m.km_at_service, m.service_date, m.next_service_km, 
        m.next_service_date, m.invoice_number, m.warranty_until,
        m.created_at, m.updated_at,
        v.brand, v.model, v.year, v.plate,
        sp.name as service_provider_name, sp.phone as service_provider_phone,
        sp.email as service_provider_email, sp.address as service_provider_address
      FROM maintenances m
      INNER JOIN vehicles v ON m.vehicle_id = v.id
      LEFT JOIN service_providers sp ON m.service_provider_id = sp.id
      WHERE m.id = $1 AND v.user_id = $2`,
      [id, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Manutenção não encontrada',
        message: 'Manutenção não existe ou não pertence ao usuário'
      });
    }
    
    logger.info('Maintenance retrieved by ID', { 
      maintenanceId: id,
      userId 
    });
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Error retrieving maintenance by ID', {
      maintenanceId: req.params.id,
      userId: req.user.id,
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível buscar a manutenção'
    });
  }
};

// Criar nova manutenção
const createMaintenance = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      vehicle_id,
      service_provider_id,
      type,
      description,
      cost,
      km_at_service,
      service_date,
      next_service_km,
      next_service_date,
      invoice_number,
      warranty_until
    } = req.body;
    
    // Verificar se o veículo pertence ao usuário
    const vehicleCheck = await pool.query(
      'SELECT id FROM vehicles WHERE id = $1 AND user_id = $2 AND is_active = true',
      [vehicle_id, userId]
    );
    
    if (vehicleCheck.rows.length === 0) {
      return res.status(403).json({
        error: 'Acesso negado',
        message: 'Veículo não encontrado ou não pertence ao usuário'
      });
    }
    
    const result = await pool.query(
      `INSERT INTO maintenances (
        vehicle_id, service_provider_id, type, description, cost, 
        km_at_service, service_date, next_service_km, next_service_date, 
        invoice_number, warranty_until, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      RETURNING *`,
      [
        vehicle_id, service_provider_id, type, description, cost,
        km_at_service, service_date, next_service_km, next_service_date,
        invoice_number, warranty_until
      ]
    );
    
    // Atualizar quilometragem do veículo se fornecida
    if (km_at_service && km_at_service > 0) {
      await pool.query(
        'UPDATE vehicles SET current_km = $1, updated_at = NOW() WHERE id = $2 AND current_km < $1',
        [km_at_service, vehicle_id]
      );
    }
    
    logger.info('Maintenance created', { 
      maintenanceId: result.rows[0].id,
      vehicleId: vehicle_id,
      userId,
      type
    });
    
    res.status(201).json({
      success: true,
      message: 'Manutenção cadastrada com sucesso',
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Error creating maintenance', {
      userId: req.user.id,
      vehicleId: req.body.vehicle_id,
      error: error.message,
      stack: error.stack
    });
    
    if (error.code === '23503') { // Foreign key violation
      return res.status(400).json({
        error: 'Dados inválidos',
        message: 'Veículo ou prestador de serviço não encontrado'
      });
    }
    
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível cadastrar a manutenção'
    });
  }
};

// Atualizar manutenção
const updateMaintenance = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const {
      service_provider_id,
      type,
      description,
      cost,
      km_at_service,
      service_date,
      next_service_km,
      next_service_date,
      invoice_number,
      warranty_until
    } = req.body;
    
    // Verificar se a manutenção pertence ao usuário
    const maintenanceCheck = await pool.query(
      `SELECT m.id, m.vehicle_id 
       FROM maintenances m
       INNER JOIN vehicles v ON m.vehicle_id = v.id
       WHERE m.id = $1 AND v.user_id = $2`,
      [id, userId]
    );
    
    if (maintenanceCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Manutenção não encontrada',
        message: 'Manutenção não existe ou não pertence ao usuário'
      });
    }
    
    const result = await pool.query(
      `UPDATE maintenances SET 
        service_provider_id = $2, type = $3, description = $4, cost = $5,
        km_at_service = $6, service_date = $7, next_service_km = $8,
        next_service_date = $9, invoice_number = $10, warranty_until = $11,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *`,
      [
        id, service_provider_id, type, description, cost,
        km_at_service, service_date, next_service_km, next_service_date,
        invoice_number, warranty_until
      ]
    );
    
    // Atualizar quilometragem do veículo se fornecida
    if (km_at_service && km_at_service > 0) {
      await pool.query(
        'UPDATE vehicles SET current_km = $1, updated_at = NOW() WHERE id = $2 AND current_km < $1',
        [km_at_service, maintenanceCheck.rows[0].vehicle_id]
      );
    }
    
    logger.info('Maintenance updated', { 
      maintenanceId: id,
      userId 
    });
    
    res.json({
      success: true,
      message: 'Manutenção atualizada com sucesso',
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Error updating maintenance', {
      maintenanceId: req.params.id,
      userId: req.user.id,
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível atualizar a manutenção'
    });
  }
};

// Excluir manutenção
const deleteMaintenance = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Verificar se a manutenção pertence ao usuário
    const maintenanceCheck = await pool.query(
      `SELECT m.id 
       FROM maintenances m
       INNER JOIN vehicles v ON m.vehicle_id = v.id
       WHERE m.id = $1 AND v.user_id = $2`,
      [id, userId]
    );
    
    if (maintenanceCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Manutenção não encontrada',
        message: 'Manutenção não existe ou não pertence ao usuário'
      });
    }
    
    await pool.query('DELETE FROM maintenances WHERE id = $1', [id]);
    
    logger.info('Maintenance deleted', { 
      maintenanceId: id,
      userId 
    });
    
    res.json({
      success: true,
      message: 'Manutenção excluída com sucesso'
    });
  } catch (error) {
    logger.error('Error deleting maintenance', {
      maintenanceId: req.params.id,
      userId: req.user.id,
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível excluir a manutenção'
    });
  }
};

// Listar manutenções de um veículo específico
const getVehicleMaintenances = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const userId = req.user.id;
    
    // Verificar se o veículo pertence ao usuário
    const vehicleCheck = await pool.query(
      'SELECT id, brand, model, year, plate FROM vehicles WHERE id = $1 AND user_id = $2',
      [vehicleId, userId]
    );
    
    if (vehicleCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Veículo não encontrado',
        message: 'Veículo não existe ou não pertence ao usuário'
      });
    }
    
    const result = await pool.query(
      `SELECT 
        m.id, m.type, m.description, m.cost, m.km_at_service, 
        m.service_date, m.next_service_km, m.next_service_date, 
        m.invoice_number, m.warranty_until, m.created_at,
        sp.name as service_provider_name, sp.phone as service_provider_phone
      FROM maintenances m
      LEFT JOIN service_providers sp ON m.service_provider_id = sp.id
      WHERE m.vehicle_id = $1
      ORDER BY m.service_date DESC, m.created_at DESC`,
      [vehicleId]
    );
    
    logger.info('Vehicle maintenances retrieved', { 
      vehicleId,
      userId,
      maintenanceCount: result.rows.length
    });
    
    res.json({
      success: true,
      vehicle: vehicleCheck.rows[0],
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    logger.error('Error retrieving vehicle maintenances', {
      vehicleId: req.params.vehicleId,
      userId: req.user.id,
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível buscar as manutenções do veículo'
    });
  }
};

// Obter estatísticas de manutenções
const getMaintenanceStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const { vehicle_id, year } = req.query;
    
    let whereConditions = 'v.user_id = $1';
    const queryParams = [userId];
    let paramCount = 1;
    
    if (vehicle_id) {
      paramCount++;
      whereConditions += ` AND m.vehicle_id = $${paramCount}`;
      queryParams.push(vehicle_id);
    }
    
    if (year) {
      paramCount++;
      whereConditions += ` AND EXTRACT(YEAR FROM m.service_date) = $${paramCount}`;
      queryParams.push(year);
    }
    
    const statsQuery = `
      SELECT 
        COUNT(*) as total_maintenances,
        COALESCE(SUM(m.cost), 0) as total_cost,
        COALESCE(AVG(m.cost), 0) as average_cost,
        COUNT(DISTINCT m.vehicle_id) as vehicles_maintained,
        COUNT(DISTINCT m.type) as maintenance_types
      FROM maintenances m
      INNER JOIN vehicles v ON m.vehicle_id = v.id
      WHERE ${whereConditions}
    `;
    
    const typeStatsQuery = `
      SELECT 
        m.type,
        COUNT(*) as count,
        COALESCE(SUM(m.cost), 0) as total_cost,
        COALESCE(AVG(m.cost), 0) as average_cost
      FROM maintenances m
      INNER JOIN vehicles v ON m.vehicle_id = v.id
      WHERE ${whereConditions}
      GROUP BY m.type
      ORDER BY count DESC
    `;
    
    const [statsResult, typeStatsResult] = await Promise.all([
      pool.query(statsQuery, queryParams),
      pool.query(typeStatsQuery, queryParams)
    ]);
    
    logger.info('Maintenance statistics retrieved', { 
      userId,
      filters: { vehicle_id, year }
    });
    
    res.json({
      success: true,
      data: {
        general: statsResult.rows[0],
        by_type: typeStatsResult.rows
      }
    });
  } catch (error) {
    logger.error('Error retrieving maintenance statistics', {
      userId: req.user.id,
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível obter as estatísticas'
    });
  }
};

module.exports = {
  getUserMaintenances,
  getMaintenanceById,
  createMaintenance,
  updateMaintenance,
  deleteMaintenance,
  getVehicleMaintenances,
  getMaintenanceStats
};