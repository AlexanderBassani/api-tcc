const { AppDataSource } = require('../config/typeorm');
const logger = require('../config/logger');

// Repository cache
let vehicleRepository = null;
let userRepository = null;

const getRepositories = () => {
  if (!vehicleRepository) {
    vehicleRepository = AppDataSource.getRepository('Vehicle');
    userRepository = AppDataSource.getRepository('User');
  }
  return { vehicleRepository, userRepository };
};

/**
 * GET /api/vehicles
 * Listar todos os veículos ativos do usuário autenticado
 */
const getUserVehicles = async (req, res) => {
  try {
    const userId = req.user.id;
    const { vehicleRepository } = getRepositories();

    const vehicles = await vehicleRepository.find({
      where: {
        user_id: userId,
        is_active: true
      },
      select: [
        'id', 'brand', 'model', 'year', 'plate', 'color', 'current_km',
        'purchase_date', 'is_active', 'notes', 'created_at', 'updated_at'
      ],
      order: {
        created_at: 'DESC'
      }
    });

    logger.info('User vehicles retrieved', {
      userId,
      vehicleCount: vehicles.length
    });

    res.json({
      success: true,
      data: vehicles,
      count: vehicles.length
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

/**
 * GET /api/vehicles/:id
 * Buscar um veículo específico do usuário autenticado
 */
const getVehicleById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { vehicleRepository } = getRepositories();

    const vehicle = await vehicleRepository.findOne({
      where: {
        id: parseInt(id),
        user_id: userId,
        is_active: true
      },
      select: [
        'id', 'brand', 'model', 'year', 'plate', 'color', 'current_km',
        'purchase_date', 'is_active', 'notes', 'created_at', 'updated_at'
      ]
    });

    if (!vehicle) {
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
      data: vehicle
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

/**
 * POST /api/vehicles
 * Criar novo veículo para o usuário autenticado
 */
const createVehicle = async (req, res) => {
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

    const { vehicleRepository } = getRepositories();

    // Usar transaction para garantir atomicidade
    await AppDataSource.transaction(async (transactionalEntityManager) => {
      const vehicleRepo = transactionalEntityManager.getRepository('Vehicle');

      // Verificar se a placa já existe
      const existingPlate = await vehicleRepo.findOne({
        where: {
          plate,
          is_active: true
        },
        select: ['id']
      });

      if (existingPlate) {
        throw new Error('PLATE_EXISTS');
      }

      // Criar novo veículo
      const newVehicle = vehicleRepo.create({
        user_id: userId,
        brand,
        model,
        year,
        plate,
        color,
        current_km,
        purchase_date,
        notes
      });

      const savedVehicle = await vehicleRepo.save(newVehicle);

      logger.info('Vehicle created successfully', {
        vehicleId: savedVehicle.id,
        userId,
        brand,
        model,
        year,
        plate
      });

      res.status(201).json({
        success: true,
        message: 'Veículo cadastrado com sucesso',
        data: savedVehicle
      });
    });
  } catch (error) {
    logger.error('Error creating vehicle', {
      userId: req.user.id,
      vehicleData: req.body,
      error: error.message,
      stack: error.stack
    });

    if (error.message === 'PLATE_EXISTS' || error.code === '23505') {
      return res.status(400).json({
        error: 'Placa já cadastrada',
        message: 'Já existe um veículo com esta placa'
      });
    }

    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível cadastrar o veículo'
    });
  }
};

/**
 * PUT /api/vehicles/:id
 * Atualizar veículo do usuário autenticado
 */
const updateVehicle = async (req, res) => {
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

    const { vehicleRepository } = getRepositories();

    await AppDataSource.transaction(async (transactionalEntityManager) => {
      const vehicleRepo = transactionalEntityManager.getRepository('Vehicle');

      // Verificar se o veículo existe e pertence ao usuário
      const existingVehicle = await vehicleRepo.findOne({
        where: {
          id: parseInt(id),
          user_id: userId,
          is_active: true
        },
        select: ['id', 'plate']
      });

      if (!existingVehicle) {
        throw new Error('VEHICLE_NOT_FOUND');
      }

      // Se a placa foi alterada, verificar se a nova placa já existe
      if (plate && plate !== existingVehicle.plate) {
        const plateExists = await vehicleRepo
          .createQueryBuilder('vehicle')
          .where('vehicle.plate = :plate', { plate })
          .andWhere('vehicle.is_active = :isActive', { isActive: true })
          .andWhere('vehicle.id != :id', { id: parseInt(id) })
          .getOne();

        if (plateExists) {
          throw new Error('PLATE_EXISTS');
        }
      }

      // Atualizar veículo
      await vehicleRepo.update(
        { id: parseInt(id), user_id: userId },
        {
          brand,
          model,
          year,
          plate,
          color,
          current_km,
          purchase_date,
          notes
        }
      );

      // Buscar veículo atualizado
      const updatedVehicle = await vehicleRepo.findOne({
        where: { id: parseInt(id) },
        select: [
          'id', 'brand', 'model', 'year', 'plate', 'color', 'current_km',
          'purchase_date', 'is_active', 'notes', 'created_at', 'updated_at'
        ]
      });

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
    });
  } catch (error) {
    logger.error('Error updating vehicle', {
      vehicleId: req.params.id,
      userId: req.user.id,
      updateData: req.body,
      error: error.message,
      stack: error.stack
    });

    if (error.message === 'VEHICLE_NOT_FOUND') {
      return res.status(404).json({
        error: 'Veículo não encontrado',
        message: 'Veículo não existe ou não pertence ao usuário'
      });
    }

    if (error.message === 'PLATE_EXISTS' || error.code === '23505') {
      return res.status(400).json({
        error: 'Placa já cadastrada',
        message: 'Já existe um veículo com esta placa'
      });
    }

    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível atualizar o veículo'
    });
  }
};

/**
 * PATCH /api/vehicles/:id/inactivate
 * Inativar veículo (soft delete)
 */
const inactivateVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { vehicleRepository } = getRepositories();

    // Atualizar veículo para inativo
    const result = await vehicleRepository
      .createQueryBuilder()
      .update('Vehicle')
      .set({ is_active: false })
      .where('id = :id', { id: parseInt(id) })
      .andWhere('user_id = :userId', { userId })
      .andWhere('is_active = :isActive', { isActive: true })
      .returning(['id', 'brand', 'model', 'plate'])
      .execute();

    if (!result.affected || result.affected === 0) {
      return res.status(404).json({
        error: 'Veículo não encontrado',
        message: 'Veículo não existe, não pertence ao usuário ou já está inativo'
      });
    }

    const inactivatedVehicle = result.raw[0];

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

/**
 * PATCH /api/vehicles/:id/reactivate
 * Reativar veículo
 */
const reactivateVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { vehicleRepository } = getRepositories();

    // Atualizar veículo para ativo
    const result = await vehicleRepository
      .createQueryBuilder()
      .update('Vehicle')
      .set({ is_active: true })
      .where('id = :id', { id: parseInt(id) })
      .andWhere('user_id = :userId', { userId })
      .andWhere('is_active = :isActive', { isActive: false })
      .returning(['id', 'brand', 'model', 'plate'])
      .execute();

    if (!result.affected || result.affected === 0) {
      return res.status(404).json({
        error: 'Veículo não encontrado',
        message: 'Veículo não existe, não pertence ao usuário ou já está ativo'
      });
    }

    const reactivatedVehicle = result.raw[0];

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

/**
 * DELETE /api/vehicles/:id
 * Excluir veículo permanentemente (hard delete)
 */
const deleteVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { vehicleRepository } = getRepositories();

    await AppDataSource.transaction(async (transactionalEntityManager) => {
      const vehicleRepo = transactionalEntityManager.getRepository('Vehicle');

      // Buscar informações do veículo antes de excluir
      const vehicle = await vehicleRepo.findOne({
        where: {
          id: parseInt(id),
          user_id: userId
        },
        select: ['id', 'brand', 'model', 'plate']
      });

      if (!vehicle) {
        throw new Error('VEHICLE_NOT_FOUND');
      }

      // Excluir o veículo (cascade irá excluir registros relacionados)
      await vehicleRepo.delete({
        id: parseInt(id),
        user_id: userId
      });

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
    });
  } catch (error) {
    logger.error('Error deleting vehicle permanently', {
      vehicleId: req.params.id,
      userId: req.user.id,
      error: error.message,
      stack: error.stack
    });

    if (error.message === 'VEHICLE_NOT_FOUND') {
      return res.status(404).json({
        error: 'Veículo não encontrado',
        message: 'Veículo não existe ou não pertence ao usuário'
      });
    }

    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível excluir o veículo'
    });
  }
};

/**
 * GET /api/vehicles/inactive
 * Listar veículos inativos do usuário autenticado
 */
const getInactiveVehicles = async (req, res) => {
  try {
    const userId = req.user.id;
    const { vehicleRepository } = getRepositories();

    const vehicles = await vehicleRepository.find({
      where: {
        user_id: userId,
        is_active: false
      },
      select: [
        'id', 'brand', 'model', 'year', 'plate', 'color', 'current_km',
        'purchase_date', 'is_active', 'notes', 'created_at', 'updated_at'
      ],
      order: {
        updated_at: 'DESC'
      }
    });

    logger.info('User inactive vehicles retrieved', {
      userId,
      vehicleCount: vehicles.length
    });

    res.json({
      success: true,
      data: vehicles,
      count: vehicles.length
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

/**
 * GET /api/vehicles/user/:userId
 * Listar veículos de um usuário específico (apenas para admin)
 */
const getUserVehiclesByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const { include_inactive = false } = req.query;
    const { vehicleRepository, userRepository } = getRepositories();

    // Verificar se o usuário existe
    const user = await userRepository.findOne({
      where: { id: parseInt(userId) },
      select: ['id', 'first_name', 'last_name', 'username', 'email']
    });

    if (!user) {
      return res.status(404).json({
        error: 'Usuário não encontrado',
        message: 'O usuário especificado não existe'
      });
    }

    // Construir query baseado nos filtros
    const queryBuilder = vehicleRepository
      .createQueryBuilder('vehicle')
      .where('vehicle.user_id = :userId', { userId: parseInt(userId) })
      .select([
        'vehicle.id', 'vehicle.brand', 'vehicle.model', 'vehicle.year',
        'vehicle.plate', 'vehicle.color', 'vehicle.current_km',
        'vehicle.purchase_date', 'vehicle.is_active', 'vehicle.notes',
        'vehicle.created_at', 'vehicle.updated_at'
      ]);

    // Filtrar apenas veículos ativos por padrão
    if (include_inactive === 'false' || include_inactive === false) {
      queryBuilder.andWhere('vehicle.is_active = :isActive', { isActive: true });
    }

    queryBuilder.orderBy('vehicle.created_at', 'DESC');

    const vehicles = await queryBuilder.getMany();

    logger.info('Admin retrieved user vehicles', {
      adminId: req.user.id,
      targetUserId: userId,
      vehicleCount: vehicles.length,
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
      data: vehicles,
      count: vehicles.length
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
