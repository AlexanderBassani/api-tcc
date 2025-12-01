const { AppDataSource } = require('../config/typeorm');
const logger = require('../config/logger');

// Repository cache
let maintenanceRepository = null;
let vehicleRepository = null;

const getRepositories = () => {
  if (!AppDataSource.isInitialized) {
    throw new Error('Database not initialized. Please ensure TypeORM is initialized before accessing repositories.');
  }
  if (!maintenanceRepository) {
    maintenanceRepository = AppDataSource.getRepository('Maintenance');
    vehicleRepository = AppDataSource.getRepository('Vehicle');
  }
  return { maintenanceRepository, vehicleRepository };
};

/**
 * GET /api/maintenances
 * Listar todas as manutenções dos veículos do usuário autenticado
 */
const getUserMaintenances = async (req, res) => {
  try {
    const userId = req.user.id;
    const { vehicle_id, type, limit = 50, offset = 0 } = req.query;
    const { maintenanceRepository } = getRepositories();

    // Construir query com joins
    const queryBuilder = maintenanceRepository
      .createQueryBuilder('m')
      .innerJoin('m.vehicle', 'v')
      .leftJoin('m.serviceProvider', 'sp')
      .where('v.user_id = :userId', { userId })
      .select([
        'm.id', 'm.vehicle_id', 'm.service_provider_id', 'm.type', 'm.description',
        'm.cost', 'm.km_at_service', 'm.service_date', 'm.next_service_km',
        'm.next_service_date', 'm.invoice_number', 'm.warranty_until',
        'm.created_at', 'm.updated_at',
        'v.brand', 'v.model', 'v.year', 'v.plate',
        'sp.name', 'sp.phone'
      ]);

    // Filtro por veículo
    if (vehicle_id) {
      queryBuilder.andWhere('m.vehicle_id = :vehicleId', { vehicleId: parseInt(vehicle_id) });
    }

    // Filtro por tipo de manutenção
    if (type) {
      queryBuilder.andWhere('m.type ILIKE :type', { type: `%${type}%` });
    }

    // Ordenação e paginação
    queryBuilder
      .orderBy('m.service_date', 'DESC')
      .addOrderBy('m.created_at', 'DESC')
      .skip(parseInt(offset))
      .take(parseInt(limit));

    const maintenances = await queryBuilder.getMany();

    logger.info('User maintenances retrieved', {
      userId,
      maintenanceCount: maintenances.length,
      filters: { vehicle_id, type, limit, offset }
    });

    res.json({
      success: true,
      data: maintenances,
      count: maintenances.length,
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

/**
 * GET /api/maintenances/:id
 * Buscar uma manutenção específica do usuário
 */
const getMaintenanceById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { maintenanceRepository } = getRepositories();

    const maintenance = await maintenanceRepository
      .createQueryBuilder('m')
      .innerJoin('m.vehicle', 'v')
      .leftJoin('m.serviceProvider', 'sp')
      .where('m.id = :id', { id: parseInt(id) })
      .andWhere('v.user_id = :userId', { userId })
      .select([
        'm.id', 'm.vehicle_id', 'm.service_provider_id', 'm.type', 'm.description',
        'm.cost', 'm.km_at_service', 'm.service_date', 'm.next_service_km',
        'm.next_service_date', 'm.invoice_number', 'm.warranty_until',
        'm.created_at', 'm.updated_at',
        'v.brand', 'v.model', 'v.year', 'v.plate',
        'sp.name', 'sp.phone', 'sp.email', 'sp.address'
      ])
      .getOne();

    if (!maintenance) {
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
      data: maintenance
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

/**
 * POST /api/maintenances
 * Criar nova manutenção
 */
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

    const { maintenanceRepository, vehicleRepository } = getRepositories();

    await AppDataSource.transaction(async (transactionalEntityManager) => {
      const maintenanceRepo = transactionalEntityManager.getRepository('Maintenance');
      const vehicleRepo = transactionalEntityManager.getRepository('Vehicle');

      // Verificar se o veículo pertence ao usuário
      const vehicle = await vehicleRepo.findOne({
        where: {
          id: parseInt(vehicle_id),
          user_id: userId,
          is_active: true
        },
        select: ['id', 'current_km']
      });

      if (!vehicle) {
        throw new Error('VEHICLE_NOT_FOUND');
      }

      // Criar nova manutenção
      const newMaintenance = maintenanceRepo.create({
        vehicle_id: parseInt(vehicle_id),
        service_provider_id: service_provider_id ? parseInt(service_provider_id) : null,
        type,
        description,
        cost,
        km_at_service,
        service_date,
        next_service_km,
        next_service_date,
        invoice_number,
        warranty_until
      });

      const savedMaintenance = await maintenanceRepo.save(newMaintenance);

      // Atualizar quilometragem do veículo se fornecida e maior que a atual
      if (km_at_service && km_at_service > vehicle.current_km) {
        await vehicleRepo.update(
          { id: parseInt(vehicle_id) },
          { current_km: km_at_service }
        );
      }

      logger.info('Maintenance created', {
        maintenanceId: savedMaintenance.id,
        vehicleId: vehicle_id,
        userId,
        type
      });

      res.status(201).json({
        success: true,
        message: 'Manutenção cadastrada com sucesso',
        data: savedMaintenance
      });
    });
  } catch (error) {
    logger.error('Error creating maintenance', {
      userId: req.user.id,
      vehicleId: req.body.vehicle_id,
      error: error.message,
      stack: error.stack
    });

    if (error.message === 'VEHICLE_NOT_FOUND') {
      return res.status(403).json({
        error: 'Acesso negado',
        message: 'Veículo não encontrado ou não pertence ao usuário'
      });
    }

    if (error.code === '23503') {
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

/**
 * PUT /api/maintenances/:id
 * Atualizar manutenção
 */
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

    const { maintenanceRepository, vehicleRepository } = getRepositories();

    await AppDataSource.transaction(async (transactionalEntityManager) => {
      const maintenanceRepo = transactionalEntityManager.getRepository('Maintenance');
      const vehicleRepo = transactionalEntityManager.getRepository('Vehicle');

      // Verificar se a manutenção pertence ao usuário
      const maintenance = await maintenanceRepo
        .createQueryBuilder('m')
        .innerJoin('m.vehicle', 'v')
        .where('m.id = :id', { id: parseInt(id) })
        .andWhere('v.user_id = :userId', { userId })
        .select(['m.id', 'm.vehicle_id', 'v.current_km'])
        .getOne();

      if (!maintenance) {
        throw new Error('MAINTENANCE_NOT_FOUND');
      }

      // Atualizar manutenção
      await maintenanceRepo.update(parseInt(id), {
        service_provider_id: service_provider_id ? parseInt(service_provider_id) : null,
        type,
        description,
        cost,
        km_at_service,
        service_date,
        next_service_km,
        next_service_date,
        invoice_number,
        warranty_until
      });

      // Buscar manutenção atualizada
      const updatedMaintenance = await maintenanceRepo.findOne({
        where: { id: parseInt(id) }
      });

      // Atualizar quilometragem do veículo se fornecida
      if (km_at_service && km_at_service > 0) {
        const vehicle = await vehicleRepo.findOne({
          where: { id: maintenance.vehicle_id },
          select: ['id', 'current_km']
        });

        if (vehicle && km_at_service > vehicle.current_km) {
          await vehicleRepo.update(
            { id: maintenance.vehicle_id },
            { current_km: km_at_service }
          );
        }
      }

      logger.info('Maintenance updated', {
        maintenanceId: id,
        userId
      });

      res.json({
        success: true,
        message: 'Manutenção atualizada com sucesso',
        data: updatedMaintenance
      });
    });
  } catch (error) {
    logger.error('Error updating maintenance', {
      maintenanceId: req.params.id,
      userId: req.user.id,
      error: error.message,
      stack: error.stack
    });

    if (error.message === 'MAINTENANCE_NOT_FOUND') {
      return res.status(404).json({
        error: 'Manutenção não encontrada',
        message: 'Manutenção não existe ou não pertence ao usuário'
      });
    }

    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível atualizar a manutenção'
    });
  }
};

/**
 * DELETE /api/maintenances/:id
 * Excluir manutenção
 */
const deleteMaintenance = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { maintenanceRepository } = getRepositories();

    // Verificar se a manutenção pertence ao usuário
    const maintenance = await maintenanceRepository
      .createQueryBuilder('m')
      .innerJoin('m.vehicle', 'v')
      .where('m.id = :id', { id: parseInt(id) })
      .andWhere('v.user_id = :userId', { userId })
      .select(['m.id'])
      .getOne();

    if (!maintenance) {
      return res.status(404).json({
        error: 'Manutenção não encontrada',
        message: 'Manutenção não existe ou não pertence ao usuário'
      });
    }

    await maintenanceRepository.delete(parseInt(id));

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

/**
 * GET /api/maintenances/vehicle/:vehicleId
 * Listar manutenções de um veículo específico
 */
const getVehicleMaintenances = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const userId = req.user.id;
    const { maintenanceRepository, vehicleRepository } = getRepositories();

    // Verificar se o veículo pertence ao usuário
    const vehicle = await vehicleRepository.findOne({
      where: {
        id: parseInt(vehicleId),
        user_id: userId
      },
      select: ['id']
    });

    if (!vehicle) {
      return res.status(404).json({
        error: 'Veículo não encontrado',
        message: 'Veículo não existe ou não pertence ao usuário'
      });
    }

    const maintenances = await maintenanceRepository.find({
      where: { vehicle_id: parseInt(vehicleId) },
      order: {
        service_date: 'DESC',
        created_at: 'DESC'
      }
    });

    logger.info('Vehicle maintenances retrieved', {
      vehicleId,
      userId,
      maintenanceCount: maintenances.length
    });

    res.json({
      success: true,
      data: maintenances,
      count: maintenances.length
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

/**
 * GET /api/maintenances/stats
 * Obter estatísticas de manutenção
 */
const getMaintenanceStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const { maintenanceRepository } = getRepositories();

    const stats = await maintenanceRepository
      .createQueryBuilder('m')
      .innerJoin('m.vehicle', 'v')
      .where('v.user_id = :userId', { userId })
      .select('COUNT(m.id)', 'total')
      .addSelect('SUM(m.cost)', 'total_cost')
      .addSelect('AVG(m.cost)', 'average_cost')
      .getRawOne();

    logger.info('Maintenance stats retrieved', {
      userId,
      stats
    });

    res.json({
      success: true,
      data: {
        total_maintenances: parseInt(stats.total) || 0,
        total_cost: parseFloat(stats.total_cost) || 0,
        average_cost: parseFloat(stats.average_cost) || 0
      }
    });
  } catch (error) {
    logger.error('Error retrieving maintenance stats', {
      userId: req.user.id,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível buscar as estatísticas'
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
