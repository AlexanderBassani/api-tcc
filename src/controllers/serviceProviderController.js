const { AppDataSource } = require('../config/typeorm');
const logger = require('../config/logger');

// Repository cache
let serviceProviderRepository = null;

const getRepositories = () => {
  if (!AppDataSource.isInitialized) {
    throw new Error('Database not initialized. Please ensure TypeORM is initialized before accessing repositories.');
  }
  if (!serviceProviderRepository) {
    serviceProviderRepository = AppDataSource.getRepository('ServiceProvider');
  }
  return { serviceProviderRepository };
};

/**
 * POST /api/service-providers
 * Criar novo prestador de serviço
 */
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

    const { serviceProviderRepository } = getRepositories();

    const newProvider = serviceProviderRepository.create({
      user_id: userId,
      name,
      type,
      phone: phone || null,
      email: email || null,
      address: address || null,
      rating: rating || 0.0,
      notes: notes || null,
      is_favorite: is_favorite || false
    });

    const savedProvider = await serviceProviderRepository.save(newProvider);

    logger.info('Service provider created', {
      serviceProviderId: savedProvider.id,
      userId,
      name
    });

    res.status(201).json({
      success: true,
      message: 'Prestador de serviço criado com sucesso',
      data: savedProvider
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

/**
 * GET /api/service-providers
 * Listar prestadores de serviço do usuário
 */
const getServiceProviders = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, is_favorite, min_rating } = req.query;

    const { serviceProviderRepository } = getRepositories();

    const queryBuilder = serviceProviderRepository
      .createQueryBuilder('sp')
      .where('sp.user_id = :userId', { userId });

    // Filtros opcionais
    if (type) {
      queryBuilder.andWhere('sp.type = :type', { type });
    }

    if (is_favorite !== undefined) {
      queryBuilder.andWhere('sp.is_favorite = :isFavorite', { isFavorite: is_favorite === 'true' });
    }

    if (min_rating) {
      queryBuilder.andWhere('sp.rating >= :minRating', { minRating: parseFloat(min_rating) });
    }

    queryBuilder
      .orderBy('sp.is_favorite', 'DESC')
      .addOrderBy('sp.rating', 'DESC')
      .addOrderBy('sp.name', 'ASC');

    const providers = await queryBuilder.getMany();

    logger.info('Service providers retrieved', {
      userId,
      count: providers.length,
      filters: { type, is_favorite, min_rating }
    });

    res.json({
      success: true,
      data: providers,
      count: providers.length
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

/**
 * GET /api/service-providers/:id
 * Buscar prestador de serviço específico
 */
const getServiceProviderById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const { serviceProviderRepository } = getRepositories();

    const provider = await serviceProviderRepository.findOne({
      where: {
        id: parseInt(id),
        user_id: userId
      }
    });

    if (!provider) {
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
      data: provider
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

/**
 * PUT /api/service-providers/:id
 * Atualizar prestador de serviço
 */
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

    const { serviceProviderRepository } = getRepositories();

    // Verificar se o prestador pertence ao usuário
    const provider = await serviceProviderRepository.findOne({
      where: {
        id: parseInt(id),
        user_id: userId
      },
      select: ['id']
    });

    if (!provider) {
      return res.status(404).json({
        error: 'Prestador de serviço não encontrado',
        message: 'Prestador de serviço não existe ou não pertence ao usuário'
      });
    }

    // Preparar dados para atualização
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (address !== undefined) updateData.address = address;
    if (rating !== undefined) updateData.rating = rating;
    if (notes !== undefined) updateData.notes = notes;
    if (is_favorite !== undefined) updateData.is_favorite = is_favorite;

    // Atualizar prestador
    await serviceProviderRepository.update(parseInt(id), updateData);

    // Buscar prestador atualizado
    const updatedProvider = await serviceProviderRepository.findOne({
      where: { id: parseInt(id) }
    });

    logger.info('Service provider updated', {
      serviceProviderId: id,
      userId
    });

    res.json({
      success: true,
      message: 'Prestador de serviço atualizado com sucesso',
      data: updatedProvider
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

/**
 * DELETE /api/service-providers/:id
 * Excluir prestador de serviço
 */
const deleteServiceProvider = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const { serviceProviderRepository } = getRepositories();

    // Verificar se o prestador pertence ao usuário
    const provider = await serviceProviderRepository.findOne({
      where: {
        id: parseInt(id),
        user_id: userId
      },
      select: ['id', 'name']
    });

    if (!provider) {
      return res.status(404).json({
        error: 'Prestador de serviço não encontrado',
        message: 'Prestador de serviço não existe ou não pertence ao usuário'
      });
    }

    await serviceProviderRepository.delete(parseInt(id));

    logger.info('Service provider deleted', {
      serviceProviderId: id,
      userId,
      name: provider.name
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

/**
 * GET /api/service-providers/favorites
 * Listar prestadores favoritos do usuário
 */
const getFavoriteProviders = async (req, res) => {
  try {
    const userId = req.user.id;

    const { serviceProviderRepository } = getRepositories();

    const providers = await serviceProviderRepository.find({
      where: {
        user_id: userId,
        is_favorite: true
      },
      order: {
        rating: 'DESC',
        name: 'ASC'
      }
    });

    logger.info('Favorite service providers retrieved', {
      userId,
      count: providers.length
    });

    res.json({
      success: true,
      data: providers,
      count: providers.length
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

/**
 * GET /api/service-providers/type/:type
 * Listar prestadores por tipo
 */
const getProvidersByType = async (req, res) => {
  try {
    const { type } = req.params;
    const userId = req.user.id;

    const { serviceProviderRepository } = getRepositories();

    const providers = await serviceProviderRepository.find({
      where: {
        user_id: userId,
        type
      },
      order: {
        is_favorite: 'DESC',
        rating: 'DESC',
        name: 'ASC'
      }
    });

    logger.info('Service providers retrieved by type', {
      userId,
      type,
      count: providers.length
    });

    res.json({
      success: true,
      data: providers,
      count: providers.length
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
