const pool = require('../config/database');
const logger = require('../config/logger');

// Criar novo prestador de serviço
const createServiceProvider = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      name,
      type,
      phone,
      email,
      address,
      rating,
      notes,
      is_favorite
    } = req.body;

    const result = await pool.query(
      `INSERT INTO service_providers (
        user_id, name, type, phone, email, address, rating, notes, is_favorite
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        userId,
        name,
        type,
        phone || null,
        email || null,
        address || null,
        rating || 0.0,
        notes || null,
        is_favorite || false
      ]
    );

    logger.info('Service provider created', {
      serviceProviderId: result.rows[0].id,
      userId,
      name
    });

    res.status(201).json({
      success: true,
      message: 'Prestador de serviço criado com sucesso',
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Error creating service provider', {
      userId: req.user.id,
      error: error.message,
      stack: error.stack
    });

    // Tratar erros de constraint
    if (error.code === '23514') { // check constraint violation
      return res.status(400).json({
        error: 'Dados inválidos',
        message: 'Verifique se os valores estão corretos (tipo, avaliação, etc.)'
      });
    }

    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível criar o prestador de serviço'
    });
  }
};

// Listar prestadores de serviço do usuário
const getServiceProviders = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, is_favorite, min_rating } = req.query;

    let query = 'SELECT * FROM service_providers WHERE user_id = $1';
    const params = [userId];
    let paramCount = 1;

    // Filtros opcionais
    if (type) {
      paramCount++;
      query += ` AND type = $${paramCount}`;
      params.push(type);
    }

    if (is_favorite !== undefined) {
      paramCount++;
      query += ` AND is_favorite = $${paramCount}`;
      params.push(is_favorite === 'true');
    }

    if (min_rating) {
      paramCount++;
      query += ` AND rating >= $${paramCount}`;
      params.push(parseFloat(min_rating));
    }

    query += ' ORDER BY is_favorite DESC, rating DESC, name ASC';

    const result = await pool.query(query, params);

    logger.info('Service providers retrieved', {
      userId,
      count: result.rows.length,
      filters: { type, is_favorite, min_rating }
    });

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    logger.error('Error retrieving service providers', {
      userId: req.user.id,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível buscar os prestadores de serviço'
    });
  }
};

// Buscar prestador de serviço específico
const getServiceProviderById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      'SELECT * FROM service_providers WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Prestador de serviço não encontrado',
        message: 'Prestador de serviço não existe ou não pertence ao usuário'
      });
    }

    logger.info('Service provider retrieved by ID', {
      serviceProviderId: id,
      userId
    });

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Error retrieving service provider by ID', {
      serviceProviderId: req.params.id,
      userId: req.user.id,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível buscar o prestador de serviço'
    });
  }
};

// Atualizar prestador de serviço
const updateServiceProvider = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const {
      name,
      type,
      phone,
      email,
      address,
      rating,
      notes,
      is_favorite
    } = req.body;

    // Verificar se o prestador pertence ao usuário
    const providerCheck = await pool.query(
      'SELECT id FROM service_providers WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (providerCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Prestador de serviço não encontrado',
        message: 'Prestador de serviço não existe ou não pertence ao usuário'
      });
    }

    // Atualizar prestador
    const result = await pool.query(
      `UPDATE service_providers SET
        name = COALESCE($1, name),
        type = COALESCE($2, type),
        phone = COALESCE($3, phone),
        email = COALESCE($4, email),
        address = COALESCE($5, address),
        rating = COALESCE($6, rating),
        notes = COALESCE($7, notes),
        is_favorite = COALESCE($8, is_favorite),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $9
       RETURNING *`,
      [name, type, phone, email, address, rating, notes, is_favorite, id]
    );

    logger.info('Service provider updated', {
      serviceProviderId: id,
      userId
    });

    res.json({
      success: true,
      message: 'Prestador de serviço atualizado com sucesso',
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Error updating service provider', {
      serviceProviderId: req.params.id,
      userId: req.user.id,
      error: error.message,
      stack: error.stack
    });

    // Tratar erros de constraint
    if (error.code === '23514') {
      return res.status(400).json({
        error: 'Dados inválidos',
        message: 'Verifique se os valores estão corretos (tipo, avaliação, etc.)'
      });
    }

    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível atualizar o prestador de serviço'
    });
  }
};

// Excluir prestador de serviço
const deleteServiceProvider = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verificar se o prestador pertence ao usuário
    const providerCheck = await pool.query(
      'SELECT id, name FROM service_providers WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (providerCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Prestador de serviço não encontrado',
        message: 'Prestador de serviço não existe ou não pertence ao usuário'
      });
    }

    await pool.query('DELETE FROM service_providers WHERE id = $1', [id]);

    logger.info('Service provider deleted', {
      serviceProviderId: id,
      userId,
      name: providerCheck.rows[0].name
    });

    res.json({
      success: true,
      message: 'Prestador de serviço excluído com sucesso'
    });
  } catch (error) {
    logger.error('Error deleting service provider', {
      serviceProviderId: req.params.id,
      userId: req.user.id,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível excluir o prestador de serviço'
    });
  }
};

// Listar prestadores favoritos do usuário
const getFavoriteProviders = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT * FROM service_providers
       WHERE user_id = $1 AND is_favorite = true
       ORDER BY rating DESC, name ASC`,
      [userId]
    );

    logger.info('Favorite service providers retrieved', {
      userId,
      count: result.rows.length
    });

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    logger.error('Error retrieving favorite service providers', {
      userId: req.user.id,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível buscar os prestadores favoritos'
    });
  }
};

// Listar prestadores por tipo
const getProvidersByType = async (req, res) => {
  try {
    const { type } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT * FROM service_providers
       WHERE user_id = $1 AND type = $2
       ORDER BY is_favorite DESC, rating DESC, name ASC`,
      [userId, type]
    );

    logger.info('Service providers retrieved by type', {
      userId,
      type,
      count: result.rows.length
    });

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    logger.error('Error retrieving service providers by type', {
      userId: req.user.id,
      type: req.params.type,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível buscar os prestadores de serviço por tipo'
    });
  }
};

module.exports = {
  createServiceProvider,
  getServiceProviders,
  getServiceProviderById,
  updateServiceProvider,
  deleteServiceProvider,
  getFavoriteProviders,
  getProvidersByType
};
