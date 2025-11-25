const pool = require('../config/database');
const logger = require('../config/logger');

// Listar todos os veículos do usuário autenticado
const getUserVehicles = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await pool.query(
      `SELECT id, brand, model, year, plate, color, current_km, 
              purchase_date, is_active, notes, created_at, updated_at
       FROM vehicles 
       WHERE user_id = $1 AND is_active = true
       ORDER BY created_at DESC`,
      [userId]
    );
    
    logger.info('User vehicles retrieved', { 
      userId, 
      vehicleCount: result.rows.length 
    });
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    logger.error('Error retrieving user vehicles', {
      userId: req.user.id,
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível buscar os veículos'
    });
  }
};

// Buscar um veículo específico do usuário
const getVehicleById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const result = await pool.query(
      `SELECT id, brand, model, year, plate, color, current_km, 
              purchase_date, is_active, notes, created_at, updated_at
       FROM vehicles 
       WHERE id = $1 AND user_id = $2 AND is_active = true`,
      [id, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Veículo não encontrado',
        message: 'Veículo não existe ou não pertence ao usuário'
      });
    }
    
    logger.info('Vehicle retrieved by ID', { 
      vehicleId: id, 
      userId 
    });
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Error retrieving vehicle by ID', {
      vehicleId: req.params.id,
      userId: req.user.id,
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível buscar o veículo'
    });
  }
};

// Criar novo veículo
const createVehicle = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user.id;
    const { 
      brand, 
      model, 
      year, 
      plate, 
      color, 
      current_km = 0, 
      purchase_date, 
      notes 
    } = req.body;
    
    await client.query('BEGIN');
    
    // Verificar se a placa já existe
    const existingPlate = await client.query(
      'SELECT id FROM vehicles WHERE plate = $1 AND is_active = true',
      [plate]
    );
    
    if (existingPlate.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Placa já cadastrada',
        message: 'Já existe um veículo com esta placa'
      });
    }
    
    const result = await client.query(
      `INSERT INTO vehicles (
        user_id, brand, model, year, plate, color, 
        current_km, purchase_date, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, brand, model, year, plate, color, current_km, 
                purchase_date, is_active, notes, created_at, updated_at`,
      [userId, brand, model, year, plate, color, current_km, purchase_date, notes]
    );
    
    await client.query('COMMIT');
    
    const newVehicle = result.rows[0];
    
    logger.info('Vehicle created successfully', {
      vehicleId: newVehicle.id,
      userId,
      brand,
      model,
      year,
      plate
    });
    
    res.status(201).json({
      success: true,
      message: 'Veículo cadastrado com sucesso',
      data: newVehicle
    });
  } catch (error) {
    await client.query('ROLLBACK');
    
    logger.error('Error creating vehicle', {
      userId: req.user.id,
      vehicleData: req.body,
      error: error.message,
      stack: error.stack
    });
    
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({
        error: 'Placa já cadastrada',
        message: 'Já existe um veículo com esta placa'
      });
    }
    
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível cadastrar o veículo'
    });
  } finally {
    client.release();
  }
};

// Atualizar veículo
const updateVehicle = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { 
      brand, 
      model, 
      year, 
      plate, 
      color, 
      current_km, 
      purchase_date, 
      notes 
    } = req.body;
    
    await client.query('BEGIN');
    
    // Verificar se o veículo existe e pertence ao usuário
    const existingVehicle = await client.query(
      'SELECT id, plate FROM vehicles WHERE id = $1 AND user_id = $2 AND is_active = true',
      [id, userId]
    );
    
    if (existingVehicle.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        error: 'Veículo não encontrado',
        message: 'Veículo não existe ou não pertence ao usuário'
      });
    }
    
    // Se a placa foi alterada, verificar se a nova placa já existe
    if (plate && plate !== existingVehicle.rows[0].plate) {
      const plateExists = await client.query(
        'SELECT id FROM vehicles WHERE plate = $1 AND is_active = true AND id != $2',
        [plate, id]
      );
      
      if (plateExists.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: 'Placa já cadastrada',
          message: 'Já existe outro veículo com esta placa'
        });
      }
    }
    
    const result = await client.query(
      `UPDATE vehicles SET
        brand = $1, model = $2, year = $3, plate = $4, color = $5,
        current_km = $6, purchase_date = $7, notes = $8, updated_at = CURRENT_TIMESTAMP
       WHERE id = $9 AND user_id = $10
       RETURNING id, brand, model, year, plate, color, current_km, 
                 purchase_date, is_active, notes, created_at, updated_at`,
      [brand, model, year, plate, color, current_km, purchase_date, notes, id, userId]
    );
    
    await client.query('COMMIT');
    
    const updatedVehicle = result.rows[0];
    
    logger.info('Vehicle updated successfully', {
      vehicleId: id,
      userId,
      updatedData: req.body
    });
    
    res.json({
      success: true,
      message: 'Veículo atualizado com sucesso',
      data: updatedVehicle
    });
  } catch (error) {
    await client.query('ROLLBACK');
    
    logger.error('Error updating vehicle', {
      vehicleId: req.params.id,
      userId: req.user.id,
      updateData: req.body,
      error: error.message,
      stack: error.stack
    });
    
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({
        error: 'Placa já cadastrada',
        message: 'Já existe um veículo com esta placa'
      });
    }
    
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível atualizar o veículo'
    });
  } finally {
    client.release();
  }
};

// Inativar veículo (soft delete)
const inactivateVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const result = await pool.query(
      `UPDATE vehicles SET 
        is_active = false, 
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2 AND is_active = true
       RETURNING id, brand, model, plate`,
      [id, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Veículo não encontrado',
        message: 'Veículo não existe, não pertence ao usuário ou já está inativo'
      });
    }
    
    const inactivatedVehicle = result.rows[0];
    
    logger.info('Vehicle inactivated successfully', {
      vehicleId: id,
      userId,
      vehicleInfo: inactivatedVehicle
    });
    
    res.json({
      success: true,
      message: 'Veículo inativado com sucesso',
      data: {
        id: inactivatedVehicle.id,
        brand: inactivatedVehicle.brand,
        model: inactivatedVehicle.model,
        plate: inactivatedVehicle.plate,
        is_active: false
      }
    });
  } catch (error) {
    logger.error('Error inactivating vehicle', {
      vehicleId: req.params.id,
      userId: req.user.id,
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível inativar o veículo'
    });
  }
};

// Reativar veículo
const reactivateVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const result = await pool.query(
      `UPDATE vehicles SET 
        is_active = true, 
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2 AND is_active = false
       RETURNING id, brand, model, plate`,
      [id, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Veículo não encontrado',
        message: 'Veículo não existe, não pertence ao usuário ou já está ativo'
      });
    }
    
    const reactivatedVehicle = result.rows[0];
    
    logger.info('Vehicle reactivated successfully', {
      vehicleId: id,
      userId,
      vehicleInfo: reactivatedVehicle
    });
    
    res.json({
      success: true,
      message: 'Veículo reativado com sucesso',
      data: {
        id: reactivatedVehicle.id,
        brand: reactivatedVehicle.brand,
        model: reactivatedVehicle.model,
        plate: reactivatedVehicle.plate,
        is_active: true
      }
    });
  } catch (error) {
    logger.error('Error reactivating vehicle', {
      vehicleId: req.params.id,
      userId: req.user.id,
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível reativar o veículo'
    });
  }
};

// Excluir veículo permanentemente (hard delete)
const deleteVehicle = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    await client.query('BEGIN');
    
    // Buscar informações do veículo antes de excluir
    const vehicleInfo = await client.query(
      'SELECT id, brand, model, plate FROM vehicles WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    
    if (vehicleInfo.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        error: 'Veículo não encontrado',
        message: 'Veículo não existe ou não pertence ao usuário'
      });
    }
    
    const vehicle = vehicleInfo.rows[0];
    
    // Excluir o veículo (cascade irá excluir registros relacionados)
    await client.query(
      'DELETE FROM vehicles WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    
    await client.query('COMMIT');
    
    logger.info('Vehicle deleted permanently', {
      vehicleId: id,
      userId,
      vehicleInfo: vehicle
    });
    
    res.json({
      success: true,
      message: 'Veículo excluído permanentemente',
      data: {
        id: vehicle.id,
        brand: vehicle.brand,
        model: vehicle.model,
        plate: vehicle.plate
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    
    logger.error('Error deleting vehicle permanently', {
      vehicleId: req.params.id,
      userId: req.user.id,
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível excluir o veículo'
    });
  } finally {
    client.release();
  }
};

// Listar veículos inativos do usuário
const getInactiveVehicles = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await pool.query(
      `SELECT id, brand, model, year, plate, color, current_km, 
              purchase_date, is_active, notes, created_at, updated_at
       FROM vehicles 
       WHERE user_id = $1 AND is_active = false
       ORDER BY updated_at DESC`,
      [userId]
    );
    
    logger.info('User inactive vehicles retrieved', { 
      userId, 
      vehicleCount: result.rows.length 
    });
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    logger.error('Error retrieving inactive vehicles', {
      userId: req.user.id,
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível buscar os veículos inativos'
    });
  }
};

// Listar veículos de um usuário específico (apenas para admin)
const getUserVehiclesByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const { include_inactive = false } = req.query;
    
    // Verificar se o usuário existe
    const userCheck = await pool.query(
      'SELECT id, first_name, last_name, username, email FROM users WHERE id = $1',
      [userId]
    );
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Usuário não encontrado',
        message: 'O usuário especificado não existe'
      });
    }
    
    const user = userCheck.rows[0];
    
    // Construir query baseado nos filtros
    let query = `
      SELECT id, brand, model, year, plate, color, current_km, 
             purchase_date, is_active, notes, created_at, updated_at
      FROM vehicles 
      WHERE user_id = $1
    `;
    
    const queryParams = [userId];
    
    // Filtrar apenas veículos ativos por padrão
    if (include_inactive === 'false' || include_inactive === false) {
      query += ' AND is_active = true';
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await pool.query(query, queryParams);
    
    logger.info('Admin retrieved user vehicles', { 
      adminId: req.user.id,
      targetUserId: userId,
      vehicleCount: result.rows.length,
      includeInactive: include_inactive
    });
    
    res.json({
      success: true,
      user: {
        id: user.id,
        name: `${user.first_name} ${user.last_name}`,
        username: user.username,
        email: user.email
      },
      data: result.rows,
      count: result.rows.length,
      filters: {
        include_inactive: include_inactive
      }
    });
  } catch (error) {
    logger.error('Error retrieving user vehicles by admin', {
      adminId: req.user.id,
      targetUserId: req.params.userId,
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível buscar os veículos do usuário'
    });
  }
};

module.exports = {
  getUserVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  inactivateVehicle,
  reactivateVehicle,
  deleteVehicle,
  getInactiveVehicles,
  getUserVehiclesByUserId
};