const pool = require('../config/database');
const logger = require('../config/logger');

// Listar todos os tipos de manutenção
const getMaintenanceTypes = async (req, res) => {
  try {
    const { has_km_interval, has_month_interval } = req.query;

    let query = 'SELECT * FROM maintenance_types WHERE 1=1';
    const params = [];
    let paramCount = 0;

    // Filtros opcionais
    if (has_km_interval !== undefined) {
      paramCount++;
      if (has_km_interval === 'true') {
        query += ` AND typical_interval_km IS NOT NULL`;
      } else {
        query += ` AND typical_interval_km IS NULL`;
      }
    }

    if (has_month_interval !== undefined) {
      paramCount++;
      if (has_month_interval === 'true') {
        query += ` AND typical_interval_months IS NOT NULL`;
      } else {
        query += ` AND typical_interval_months IS NULL`;
      }
    }

    query += ' ORDER BY display_name ASC';

    const result = await pool.query(query, params);

    logger.info('Maintenance types retrieved', {
      userId: req.user.id,
      count: result.rows.length,
      filters: { has_km_interval, has_month_interval }
    });

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    logger.error('Error retrieving maintenance types', {
      userId: req.user.id,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível buscar os tipos de manutenção'
    });
  }
};

// Buscar tipo de manutenção específico
const getMaintenanceTypeById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM maintenance_types WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Tipo de manutenção não encontrado',
        message: 'O tipo de manutenção especificado não existe'
      });
    }

    logger.info('Maintenance type retrieved by ID', {
      maintenanceTypeId: id,
      userId: req.user.id
    });

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Error retrieving maintenance type by ID', {
      maintenanceTypeId: req.params.id,
      userId: req.user.id,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível buscar o tipo de manutenção'
    });
  }
};

// Criar novo tipo de manutenção (apenas admin)
const createMaintenanceType = async (req, res) => {
  try {
    const {
      name,
      display_name,
      typical_interval_km,
      typical_interval_months,
      icon
    } = req.body;

    const result = await pool.query(
      `INSERT INTO maintenance_types (
        name, display_name, typical_interval_km, typical_interval_months, icon
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [
        name,
        display_name,
        typical_interval_km || null,
        typical_interval_months || null,
        icon || null
      ]
    );

    logger.info('Maintenance type created', {
      maintenanceTypeId: result.rows[0].id,
      userId: req.user.id,
      name
    });

    res.status(201).json({
      success: true,
      message: 'Tipo de manutenção criado com sucesso',
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Error creating maintenance type', {
      userId: req.user.id,
      error: error.message,
      stack: error.stack
    });

    // Tratar erros de constraint
    if (error.code === '23505') { // unique violation
      return res.status(400).json({
        error: 'Tipo já existe',
        message: 'Já existe um tipo de manutenção com este nome'
      });
    }

    if (error.code === '23514') { // check constraint violation
      return res.status(400).json({
        error: 'Dados inválidos',
        message: 'Verifique se os intervalos são valores positivos'
      });
    }

    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível criar o tipo de manutenção'
    });
  }
};

// Atualizar tipo de manutenção (apenas admin)
const updateMaintenanceType = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      display_name,
      typical_interval_km,
      typical_interval_months,
      icon
    } = req.body;

    // Verificar se o tipo existe
    const typeCheck = await pool.query(
      'SELECT id FROM maintenance_types WHERE id = $1',
      [id]
    );

    if (typeCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Tipo de manutenção não encontrado',
        message: 'O tipo de manutenção especificado não existe'
      });
    }

    // Atualizar tipo
    const result = await pool.query(
      `UPDATE maintenance_types SET
        name = COALESCE($1, name),
        display_name = COALESCE($2, display_name),
        typical_interval_km = COALESCE($3, typical_interval_km),
        typical_interval_months = COALESCE($4, typical_interval_months),
        icon = COALESCE($5, icon)
       WHERE id = $6
       RETURNING *`,
      [name, display_name, typical_interval_km, typical_interval_months, icon, id]
    );

    logger.info('Maintenance type updated', {
      maintenanceTypeId: id,
      userId: req.user.id
    });

    res.json({
      success: true,
      message: 'Tipo de manutenção atualizado com sucesso',
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Error updating maintenance type', {
      maintenanceTypeId: req.params.id,
      userId: req.user.id,
      error: error.message,
      stack: error.stack
    });

    // Tratar erros de constraint
    if (error.code === '23505') {
      return res.status(400).json({
        error: 'Nome já existe',
        message: 'Já existe um tipo de manutenção com este nome'
      });
    }

    if (error.code === '23514') {
      return res.status(400).json({
        error: 'Dados inválidos',
        message: 'Verifique se os intervalos são valores positivos'
      });
    }

    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível atualizar o tipo de manutenção'
    });
  }
};

// Excluir tipo de manutenção (apenas admin)
const deleteMaintenanceType = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se o tipo existe
    const typeCheck = await pool.query(
      'SELECT id, name FROM maintenance_types WHERE id = $1',
      [id]
    );

    if (typeCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Tipo de manutenção não encontrado',
        message: 'O tipo de manutenção especificado não existe'
      });
    }

    // Verificar se existem manutenções usando este tipo (por nome)
    const typeName = typeCheck.rows[0].name;
    const usageCheck = await pool.query(
      'SELECT COUNT(*) as count FROM maintenances WHERE type = $1',
      [typeName]
    );

    if (parseInt(usageCheck.rows[0].count) > 0) {
      return res.status(400).json({
        error: 'Tipo em uso',
        message: 'Não é possível excluir este tipo pois existem manutenções cadastradas com ele'
      });
    }

    await pool.query('DELETE FROM maintenance_types WHERE id = $1', [id]);

    logger.info('Maintenance type deleted', {
      maintenanceTypeId: id,
      userId: req.user.id,
      name: typeCheck.rows[0].name
    });

    res.json({
      success: true,
      message: 'Tipo de manutenção excluído com sucesso'
    });
  } catch (error) {
    logger.error('Error deleting maintenance type', {
      maintenanceTypeId: req.params.id,
      userId: req.user.id,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível excluir o tipo de manutenção'
    });
  }
};

module.exports = {
  getMaintenanceTypes,
  getMaintenanceTypeById,
  createMaintenanceType,
  updateMaintenanceType,
  deleteMaintenanceType
};
