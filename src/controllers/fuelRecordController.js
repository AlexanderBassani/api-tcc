const { AppDataSource } = require('../config/typeorm');
const logger = require('../config/logger');
const { Between, LessThanOrEqual, MoreThanOrEqual } = require('typeorm');

const fuelRecordRepository = AppDataSource.getRepository('FuelRecord');
const vehicleRepository = AppDataSource.getRepository('Vehicle');

// Criar novo registro de abastecimento
const createFuelRecord = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      vehicle_id,
      date,
      km,
      liters,
      price_per_liter,
      fuel_type,
      is_full_tank,
      gas_station,
      notes
    } = req.body;

    // Verificar se o veículo pertence ao usuário
    const vehicle = await vehicleRepository.findOne({
      where: { id: vehicle_id, user_id: userId },
      select: ['id', 'current_km']
    });

    if (!vehicle) {
      return res.status(404).json({
        error: 'Veículo não encontrado',
        message: 'Veículo não existe ou não pertence ao usuário'
      });
    }

    // Calcular total_cost
    const total_cost = (parseFloat(liters) * parseFloat(price_per_liter)).toFixed(2);

    // Criar registro de abastecimento
    const fuelRecord = fuelRecordRepository.create({
      vehicle_id,
      date,
      km,
      liters,
      price_per_liter,
      total_cost,
      fuel_type: fuel_type || 'gasoline',
      is_full_tank: is_full_tank || false,
      gas_station: gas_station || null,
      notes: notes || null
    });

    const savedRecord = await fuelRecordRepository.save(fuelRecord);

    // Atualizar quilometragem do veículo se maior que a atual
    if (km > vehicle.current_km) {
      await vehicleRepository.update(vehicle_id, { current_km: km });
    }

    logger.info('Fuel record created', {
      fuelRecordId: savedRecord.id,
      userId,
      vehicleId: vehicle_id,
      km
    });

    res.status(201).json({
      success: true,
      message: 'Registro de abastecimento criado com sucesso',
      data: savedRecord
    });
  } catch (error) {
    logger.error('Error creating fuel record', {
      userId: req.user.id,
      error: error.message,
      stack: error.stack
    });

    // Tratar erros de constraint
    if (error.code === '23514') { // check constraint violation
      return res.status(400).json({
        error: 'Dados inválidos',
        message: 'Verifique se os valores estão corretos (litros, preço, data, etc.)'
      });
    }

    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível criar o registro de abastecimento'
    });
  }
};

// Listar registros de abastecimento do usuário
const getFuelRecords = async (req, res) => {
  try {
    const userId = req.user.id;
    const { vehicle_id, fuel_type, start_date, end_date } = req.query;

    const queryBuilder = fuelRecordRepository
      .createQueryBuilder('fr')
      .innerJoin('fr.vehicle', 'v')
      .addSelect(['v.brand', 'v.model', 'v.plate'])
      .where('v.user_id = :userId', { userId });

    // Filtros opcionais
    if (vehicle_id) {
      queryBuilder.andWhere('fr.vehicle_id = :vehicleId', { vehicleId: vehicle_id });
    }

    if (fuel_type) {
      queryBuilder.andWhere('fr.fuel_type = :fuelType', { fuelType: fuel_type });
    }

    if (start_date && end_date) {
      queryBuilder.andWhere('fr.date BETWEEN :startDate AND :endDate', {
        startDate: start_date,
        endDate: end_date
      });
    } else if (start_date) {
      queryBuilder.andWhere('fr.date >= :startDate', { startDate: start_date });
    } else if (end_date) {
      queryBuilder.andWhere('fr.date <= :endDate', { endDate: end_date });
    }

    queryBuilder.orderBy('fr.date', 'DESC').addOrderBy('fr.km', 'DESC');

    const records = await queryBuilder.getMany();

    logger.info('Fuel records retrieved', {
      userId,
      count: records.length,
      filters: { vehicle_id, fuel_type, start_date, end_date }
    });

    res.json({
      success: true,
      data: records,
      count: records.length
    });
  } catch (error) {
    logger.error('Error retrieving fuel records', {
      userId: req.user.id,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível buscar os registros de abastecimento'
    });
  }
};

// Buscar registro de abastecimento específico
const getFuelRecordById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const record = await fuelRecordRepository
      .createQueryBuilder('fr')
      .innerJoin('fr.vehicle', 'v')
      .addSelect(['v.brand', 'v.model', 'v.plate'])
      .where('fr.id = :id', { id })
      .andWhere('v.user_id = :userId', { userId })
      .getOne();

    if (!record) {
      return res.status(404).json({
        error: 'Registro não encontrado',
        message: 'Registro de abastecimento não existe ou não pertence ao usuário'
      });
    }

    logger.info('Fuel record retrieved by ID', {
      fuelRecordId: id,
      userId
    });

    res.json({
      success: true,
      data: record
    });
  } catch (error) {
    logger.error('Error retrieving fuel record by ID', {
      fuelRecordId: req.params.id,
      userId: req.user.id,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível buscar o registro de abastecimento'
    });
  }
};

// Atualizar registro de abastecimento
const updateFuelRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const {
      date,
      km,
      liters,
      price_per_liter,
      fuel_type,
      is_full_tank,
      gas_station,
      notes
    } = req.body;

    // Verificar se o registro pertence ao usuário
    const record = await fuelRecordRepository
      .createQueryBuilder('fr')
      .innerJoin('fr.vehicle', 'v')
      .addSelect(['v.current_km', 'v.id'])
      .where('fr.id = :id', { id })
      .andWhere('v.user_id = :userId', { userId })
      .getOne();

    if (!record) {
      return res.status(404).json({
        error: 'Registro não encontrado',
        message: 'Registro de abastecimento não existe ou não pertence ao usuário'
      });
    }

    // Preparar dados para atualização
    const updateData = {};
    if (date !== undefined) updateData.date = date;
    if (km !== undefined) updateData.km = km;
    if (liters !== undefined) updateData.liters = liters;
    if (price_per_liter !== undefined) updateData.price_per_liter = price_per_liter;
    if (fuel_type !== undefined) updateData.fuel_type = fuel_type;
    if (is_full_tank !== undefined) updateData.is_full_tank = is_full_tank;
    if (gas_station !== undefined) updateData.gas_station = gas_station;
    if (notes !== undefined) updateData.notes = notes;

    // Calcular total_cost se liters ou price_per_liter foram fornecidos
    if (liters !== undefined || price_per_liter !== undefined) {
      const finalLiters = liters !== undefined ? liters : record.liters;
      const finalPrice = price_per_liter !== undefined ? price_per_liter : record.price_per_liter;
      updateData.total_cost = (parseFloat(finalLiters) * parseFloat(finalPrice)).toFixed(2);
    }

    // Atualizar registro
    await fuelRecordRepository.update(id, updateData);

    // Buscar registro atualizado
    const updatedRecord = await fuelRecordRepository.findOne({ where: { id } });

    // Atualizar quilometragem do veículo se necessário
    if (km && km > record.vehicle.current_km) {
      await vehicleRepository.update(record.vehicle_id, { current_km: km });
    }

    logger.info('Fuel record updated', {
      fuelRecordId: id,
      userId
    });

    res.json({
      success: true,
      message: 'Registro de abastecimento atualizado com sucesso',
      data: updatedRecord
    });
  } catch (error) {
    logger.error('Error updating fuel record', {
      fuelRecordId: req.params.id,
      userId: req.user.id,
      error: error.message,
      stack: error.stack
    });

    // Tratar erros de constraint
    if (error.code === '23514') {
      return res.status(400).json({
        error: 'Dados inválidos',
        message: 'Verifique se os valores estão corretos'
      });
    }

    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível atualizar o registro de abastecimento'
    });
  }
};

// Excluir registro de abastecimento
const deleteFuelRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verificar se o registro pertence ao usuário
    const record = await fuelRecordRepository
      .createQueryBuilder('fr')
      .innerJoin('fr.vehicle', 'v')
      .select(['fr.id', 'fr.date', 'fr.km'])
      .where('fr.id = :id', { id })
      .andWhere('v.user_id = :userId', { userId })
      .getOne();

    if (!record) {
      return res.status(404).json({
        error: 'Registro não encontrado',
        message: 'Registro de abastecimento não existe ou não pertence ao usuário'
      });
    }

    await fuelRecordRepository.delete(id);

    logger.info('Fuel record deleted', {
      fuelRecordId: id,
      userId,
      date: record.date,
      km: record.km
    });

    res.json({
      success: true,
      message: 'Registro de abastecimento excluído com sucesso'
    });
  } catch (error) {
    logger.error('Error deleting fuel record', {
      fuelRecordId: req.params.id,
      userId: req.user.id,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível excluir o registro de abastecimento'
    });
  }
};

// Listar registros de abastecimento por veículo
const getFuelRecordsByVehicle = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const userId = req.user.id;

    // Verificar se o veículo pertence ao usuário
    const vehicle = await vehicleRepository.findOne({
      where: { id: vehicleId, user_id: userId },
      select: ['id']
    });

    if (!vehicle) {
      return res.status(404).json({
        error: 'Veículo não encontrado',
        message: 'Veículo não existe ou não pertence ao usuário'
      });
    }

    const records = await fuelRecordRepository
      .createQueryBuilder('fr')
      .innerJoin('fr.vehicle', 'v')
      .addSelect(['v.brand', 'v.model', 'v.plate'])
      .where('fr.vehicle_id = :vehicleId', { vehicleId })
      .orderBy('fr.date', 'DESC')
      .addOrderBy('fr.km', 'DESC')
      .getMany();

    logger.info('Fuel records retrieved by vehicle', {
      vehicleId,
      userId,
      count: records.length
    });

    res.json({
      success: true,
      data: records,
      count: records.length
    });
  } catch (error) {
    logger.error('Error retrieving fuel records by vehicle', {
      vehicleId: req.params.vehicleId,
      userId: req.user.id,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível buscar os registros de abastecimento do veículo'
    });
  }
};

// Obter estatísticas de consumo
const getFuelStatistics = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const userId = req.user.id;

    // Verificar se o veículo pertence ao usuário
    const vehicle = await vehicleRepository.findOne({
      where: { id: vehicleId, user_id: userId },
      select: ['id', 'brand', 'model', 'plate']
    });

    if (!vehicle) {
      return res.status(404).json({
        error: 'Veículo não encontrado',
        message: 'Veículo não existe ou não pertence ao usuário'
      });
    }

    // Buscar estatísticas gerais
    const stats = await fuelRecordRepository
      .createQueryBuilder('fr')
      .select('COUNT(*)', 'total_records')
      .addSelect('SUM(fr.liters)', 'total_liters')
      .addSelect('SUM(fr.total_cost)', 'total_spent')
      .addSelect('AVG(fr.price_per_liter)', 'avg_price_per_liter')
      .addSelect('MIN(fr.date)', 'first_record_date')
      .addSelect('MAX(fr.date)', 'last_record_date')
      .addSelect('MIN(fr.km)', 'first_km')
      .addSelect('MAX(fr.km)', 'last_km')
      .where('fr.vehicle_id = :vehicleId', { vehicleId })
      .getRawOne();

    // Calcular consumo médio (apenas com tanques cheios consecutivos)
    const consumption = await fuelRecordRepository.query(`
      WITH full_tanks AS (
        SELECT
          km,
          liters,
          date,
          LAG(km) OVER (ORDER BY date, km) as prev_km,
          LAG(is_full_tank) OVER (ORDER BY date, km) as prev_full_tank
        FROM fuel_records
        WHERE vehicle_id = $1 AND is_full_tank = true
        ORDER BY date, km
      )
      SELECT
        AVG((km - prev_km) / liters) as avg_consumption_km_per_liter,
        COUNT(*) as consumption_records
      FROM full_tanks
      WHERE prev_km IS NOT NULL AND prev_full_tank = true AND km > prev_km
    `, [vehicleId]);

    // Estatísticas por tipo de combustível
    const byFuelType = await fuelRecordRepository
      .createQueryBuilder('fr')
      .select('fr.fuel_type', 'fuel_type')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(fr.liters)', 'total_liters')
      .addSelect('SUM(fr.total_cost)', 'total_cost')
      .addSelect('AVG(fr.price_per_liter)', 'avg_price')
      .where('fr.vehicle_id = :vehicleId', { vehicleId })
      .groupBy('fr.fuel_type')
      .orderBy('count', 'DESC')
      .getRawMany();

    const statistics = {
      vehicle,
      overview: {
        total_records: parseInt(stats.total_records),
        total_liters: parseFloat(stats.total_liters) || 0,
        total_spent: parseFloat(stats.total_spent) || 0,
        avg_price_per_liter: parseFloat(stats.avg_price_per_liter) || 0,
        first_record_date: stats.first_record_date,
        last_record_date: stats.last_record_date,
        total_km_tracked: (stats.last_km - stats.first_km) || 0
      },
      consumption: {
        avg_km_per_liter: parseFloat(consumption[0]?.avg_consumption_km_per_liter) || null,
        records_used: parseInt(consumption[0]?.consumption_records) || 0
      },
      by_fuel_type: byFuelType.map(row => ({
        fuel_type: row.fuel_type,
        count: parseInt(row.count),
        total_liters: parseFloat(row.total_liters),
        total_cost: parseFloat(row.total_cost),
        avg_price: parseFloat(row.avg_price)
      }))
    };

    logger.info('Fuel statistics retrieved', {
      vehicleId,
      userId
    });

    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    logger.error('Error retrieving fuel statistics', {
      vehicleId: req.params.vehicleId,
      userId: req.user.id,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível calcular as estatísticas de consumo'
    });
  }
};

module.exports = {
  createFuelRecord,
  getFuelRecords,
  getFuelRecordById,
  updateFuelRecord,
  deleteFuelRecord,
  getFuelRecordsByVehicle,
  getFuelStatistics
};
