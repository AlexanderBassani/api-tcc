const { AppDataSource } = require('../config/typeorm');
const logger = require('../config/logger');

// Repository cache
let maintenanceTypeRepository = null;
let maintenanceRepository = null;

const getRepositories = () => {
  if (!AppDataSource.isInitialized) {
    throw new Error('Database not initialized. Please ensure TypeORM is initialized before accessing repositories.');
  }
  if (!maintenanceTypeRepository) {
    maintenanceTypeRepository = AppDataSource.getRepository('MaintenanceType');
    maintenanceRepository = AppDataSource.getRepository('Maintenance');
  }
  return { maintenanceTypeRepository, maintenanceRepository };
};

/**
 * GET /api/maintenance-types
 * Listar todos os tipos de manutenção
 */
const getMaintenanceTypes = async (req, res) => {
  try {
    const { has_km_interval, has_month_interval } = req.query;
    const { maintenanceTypeRepository } = getRepositories();

    const queryBuilder = maintenanceTypeRepository.createQueryBuilder('mt');

    // Filtros opcionais
    if (has_km_interval !== undefined) {
      if (has_km_interval === 'true') {
        queryBuilder.andWhere('mt.typical_interval_km IS NOT NULL');
      } else {
        queryBuilder.andWhere('mt.typical_interval_km IS NULL');
      }
    }

    if (has_month_interval !== undefined) {
      if (has_month_interval === 'true') {
        queryBuilder.andWhere('mt.typical_interval_months IS NOT NULL');
      } else {
        queryBuilder.andWhere('mt.typical_interval_months IS NULL');
      }
    }

    queryBuilder.orderBy('mt.display_name', 'ASC');

    const types = await queryBuilder.getMany();

    logger.info('Maintenance types retrieved', {
      userId: req.user.id,
      count: types.length,
      filters: { has_km_interval, has_month_interval }
    });

    res.json({
      success: true,
      data: types,
      count: types.length
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

/**
 * GET /api/maintenance-types/:id
 * Buscar tipo de manutenção específico
 */
const getMaintenanceTypeById = async (req, res) => {
  try {
    const { id } = req.params;
    const { maintenanceTypeRepository } = getRepositories();

    const type = await maintenanceTypeRepository.findOne({
      where: { id: parseInt(id) }
    });

    if (!type) {
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
      data: type
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

/**
 * POST /api/maintenance-types
 * Criar novo tipo de manutenção (apenas admin)
 */
const createMaintenanceType = async (req, res) => {
  try {
    const {
      name,
      display_name,
      typical_interval_km,
      typical_interval_months,
      icon
    } = req.body;

    const { maintenanceTypeRepository } = getRepositories();

    const newType = maintenanceTypeRepository.create({
      name,
      display_name,
      typical_interval_km: typical_interval_km || null,
      typical_interval_months: typical_interval_months || null,
      icon: icon || null
    });

    const savedType = await maintenanceTypeRepository.save(newType);

    logger.info('Maintenance type created', {
      maintenanceTypeId: savedType.id,
      userId: req.user.id,
      name
    });

    res.status(201).json({
      success: true,
      message: 'Tipo de manutenção criado com sucesso',
      data: savedType
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

/**
 * PUT /api/maintenance-types/:id
 * Atualizar tipo de manutenção (apenas admin)
 */
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

    const { maintenanceTypeRepository } = getRepositories();

    // Verificar se o tipo existe
    const type = await maintenanceTypeRepository.findOne({
      where: { id: parseInt(id) }
    });

    if (!type) {
      return res.status(404).json({
        error: 'Tipo de manutenção não encontrado',
        message: 'O tipo de manutenção especificado não existe'
      });
    }

    // Preparar dados para atualização
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (display_name !== undefined) updateData.display_name = display_name;
    if (typical_interval_km !== undefined) updateData.typical_interval_km = typical_interval_km;
    if (typical_interval_months !== undefined) updateData.typical_interval_months = typical_interval_months;
    if (icon !== undefined) updateData.icon = icon;

    // Atualizar tipo
    await maintenanceTypeRepository.update(parseInt(id), updateData);

    // Buscar tipo atualizado
    const updatedType = await maintenanceTypeRepository.findOne({
      where: { id: parseInt(id) }
    });

    logger.info('Maintenance type updated', {
      maintenanceTypeId: id,
      userId: req.user.id
    });

    res.json({
      success: true,
      message: 'Tipo de manutenção atualizado com sucesso',
      data: updatedType
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

/**
 * DELETE /api/maintenance-types/:id
 * Excluir tipo de manutenção (apenas admin)
 */
const deleteMaintenanceType = async (req, res) => {
  try {
    const { id } = req.params;
    const { maintenanceTypeRepository, maintenanceRepository } = getRepositories();

    // Verificar se o tipo existe
    const type = await maintenanceTypeRepository.findOne({
      where: { id: parseInt(id) },
      select: ['id', 'name']
    });

    if (!type) {
      return res.status(404).json({
        error: 'Tipo de manutenção não encontrado',
        message: 'O tipo de manutenção especificado não existe'
      });
    }

    // Verificar se existem manutenções usando este tipo (por nome)
    const usageCount = await maintenanceRepository.count({
      where: { type: type.name }
    });

    if (usageCount > 0) {
      return res.status(400).json({
        error: 'Tipo em uso',
        message: 'Não é possível excluir este tipo pois existem manutenções cadastradas com ele'
      });
    }

    await maintenanceTypeRepository.delete(parseInt(id));

    logger.info('Maintenance type deleted', {
      maintenanceTypeId: id,
      userId: req.user.id,
      name: type.name
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
