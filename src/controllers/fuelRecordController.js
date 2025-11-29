const pool = require('../config/database');
const logger = require('../config/logger');

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
    const vehicleCheck = await pool.query(
      'SELECT id, current_km FROM vehicles WHERE id = $1 AND user_id = $2',
      [vehicle_id, userId]
    );

    if (vehicleCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Veículo não encontrado',
        message: 'Veículo não existe ou não pertence ao usuário'
      });
    }

    // Calcular total_cost
    const total_cost = (parseFloat(liters) * parseFloat(price_per_liter)).toFixed(2);

    // Criar registro de abastecimento
    const result = await pool.query(
      `INSERT INTO fuel_records (
        vehicle_id, date, km, liters, price_per_liter, total_cost,
        fuel_type, is_full_tank, gas_station, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        vehicle_id,
        date,
        km,
        liters,
        price_per_liter,
        total_cost,
        fuel_type || 'gasoline',
        is_full_tank || false,
        gas_station || null,
        notes || null
      ]
    );

    // Atualizar quilometragem do veículo se maior que a atual
    const currentKm = vehicleCheck.rows[0].current_km;
    if (km > currentKm) {
      await pool.query(
        'UPDATE vehicles SET current_km = $1 WHERE id = $2',
        [km, vehicle_id]
      );
    }

    logger.info('Fuel record created', {
      fuelRecordId: result.rows[0].id,
      userId,
      vehicleId: vehicle_id,
      km
    });

    res.status(201).json({
      success: true,
      message: 'Registro de abastecimento criado com sucesso',
      data: result.rows[0]
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

    let query = `
      SELECT fr.*, v.brand, v.model, v.plate
      FROM fuel_records fr
      INNER JOIN vehicles v ON fr.vehicle_id = v.id
      WHERE v.user_id = $1
    `;
    const params = [userId];
    let paramCount = 1;

    // Filtros opcionais
    if (vehicle_id) {
      paramCount++;
      query += ` AND fr.vehicle_id = $${paramCount}`;
      params.push(vehicle_id);
    }

    if (fuel_type) {
      paramCount++;
      query += ` AND fr.fuel_type = $${paramCount}`;
      params.push(fuel_type);
    }

    if (start_date) {
      paramCount++;
      query += ` AND fr.date >= $${paramCount}`;
      params.push(start_date);
    }

    if (end_date) {
      paramCount++;
      query += ` AND fr.date <= $${paramCount}`;
      params.push(end_date);
    }

    query += ' ORDER BY fr.date DESC, fr.km DESC';

    const result = await pool.query(query, params);

    logger.info('Fuel records retrieved', {
      userId,
      count: result.rows.length,
      filters: { vehicle_id, fuel_type, start_date, end_date }
    });

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
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

    const result = await pool.query(
      `SELECT fr.*, v.brand, v.model, v.plate
       FROM fuel_records fr
       INNER JOIN vehicles v ON fr.vehicle_id = v.id
       WHERE fr.id = $1 AND v.user_id = $2`,
      [id, userId]
    );

    if (result.rows.length === 0) {
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
      data: result.rows[0]
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
    const recordCheck = await pool.query(
      `SELECT fr.id, fr.vehicle_id, v.current_km
       FROM fuel_records fr
       INNER JOIN vehicles v ON fr.vehicle_id = v.id
       WHERE fr.id = $1 AND v.user_id = $2`,
      [id, userId]
    );

    if (recordCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Registro não encontrado',
        message: 'Registro de abastecimento não existe ou não pertence ao usuário'
      });
    }

    // Calcular total_cost se liters ou price_per_liter foram fornecidos
    let total_cost = null;
    if (liters && price_per_liter) {
      total_cost = (parseFloat(liters) * parseFloat(price_per_liter)).toFixed(2);
    }

    // Atualizar registro
    const result = await pool.query(
      `UPDATE fuel_records SET
        date = COALESCE($1, date),
        km = COALESCE($2, km),
        liters = COALESCE($3, liters),
        price_per_liter = COALESCE($4, price_per_liter),
        total_cost = CASE
          WHEN $5::DECIMAL IS NOT NULL THEN $5::DECIMAL
          WHEN $3 IS NOT NULL OR $4 IS NOT NULL THEN liters * price_per_liter
          ELSE total_cost
        END,
        fuel_type = COALESCE($6, fuel_type),
        is_full_tank = COALESCE($7, is_full_tank),
        gas_station = COALESCE($8, gas_station),
        notes = COALESCE($9, notes)
       WHERE id = $10
       RETURNING *`,
      [
        date,
        km,
        liters,
        price_per_liter,
        total_cost,
        fuel_type,
        is_full_tank,
        gas_station,
        notes,
        id
      ]
    );

    // Atualizar quilometragem do veículo se necessário
    if (km) {
      const vehicleId = recordCheck.rows[0].vehicle_id;
      const currentKm = recordCheck.rows[0].current_km;
      if (km > currentKm) {
        await pool.query(
          'UPDATE vehicles SET current_km = $1 WHERE id = $2',
          [km, vehicleId]
        );
      }
    }

    logger.info('Fuel record updated', {
      fuelRecordId: id,
      userId
    });

    res.json({
      success: true,
      message: 'Registro de abastecimento atualizado com sucesso',
      data: result.rows[0]
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
    const recordCheck = await pool.query(
      `SELECT fr.id, fr.date, fr.km
       FROM fuel_records fr
       INNER JOIN vehicles v ON fr.vehicle_id = v.id
       WHERE fr.id = $1 AND v.user_id = $2`,
      [id, userId]
    );

    if (recordCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Registro não encontrado',
        message: 'Registro de abastecimento não existe ou não pertence ao usuário'
      });
    }

    await pool.query('DELETE FROM fuel_records WHERE id = $1', [id]);

    logger.info('Fuel record deleted', {
      fuelRecordId: id,
      userId,
      date: recordCheck.rows[0].date,
      km: recordCheck.rows[0].km
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
    const vehicleCheck = await pool.query(
      'SELECT id FROM vehicles WHERE id = $1 AND user_id = $2',
      [vehicleId, userId]
    );

    if (vehicleCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Veículo não encontrado',
        message: 'Veículo não existe ou não pertence ao usuário'
      });
    }

    const result = await pool.query(
      `SELECT fr.*, v.brand, v.model, v.plate
       FROM fuel_records fr
       INNER JOIN vehicles v ON fr.vehicle_id = v.id
       WHERE fr.vehicle_id = $1
       ORDER BY fr.date DESC, fr.km DESC`,
      [vehicleId]
    );

    logger.info('Fuel records retrieved by vehicle', {
      vehicleId,
      userId,
      count: result.rows.length
    });

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
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
    const vehicleCheck = await pool.query(
      'SELECT id, brand, model, plate FROM vehicles WHERE id = $1 AND user_id = $2',
      [vehicleId, userId]
    );

    if (vehicleCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Veículo não encontrado',
        message: 'Veículo não existe ou não pertence ao usuário'
      });
    }

    // Buscar estatísticas gerais
    const stats = await pool.query(
      `SELECT
        COUNT(*) as total_records,
        SUM(liters) as total_liters,
        SUM(total_cost) as total_spent,
        AVG(price_per_liter) as avg_price_per_liter,
        MIN(date) as first_record_date,
        MAX(date) as last_record_date,
        MIN(km) as first_km,
        MAX(km) as last_km
       FROM fuel_records
       WHERE vehicle_id = $1`,
      [vehicleId]
    );

    // Calcular consumo médio (apenas com tanques cheios consecutivos)
    const consumption = await pool.query(
      `WITH full_tanks AS (
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
      WHERE prev_km IS NOT NULL AND prev_full_tank = true AND km > prev_km`,
      [vehicleId]
    );

    // Estatísticas por tipo de combustível
    const byFuelType = await pool.query(
      `SELECT
        fuel_type,
        COUNT(*) as count,
        SUM(liters) as total_liters,
        SUM(total_cost) as total_cost,
        AVG(price_per_liter) as avg_price
       FROM fuel_records
       WHERE vehicle_id = $1
       GROUP BY fuel_type
       ORDER BY count DESC`,
      [vehicleId]
    );

    const statistics = {
      vehicle: vehicleCheck.rows[0],
      overview: {
        total_records: parseInt(stats.rows[0].total_records),
        total_liters: parseFloat(stats.rows[0].total_liters) || 0,
        total_spent: parseFloat(stats.rows[0].total_spent) || 0,
        avg_price_per_liter: parseFloat(stats.rows[0].avg_price_per_liter) || 0,
        first_record_date: stats.rows[0].first_record_date,
        last_record_date: stats.rows[0].last_record_date,
        total_km_tracked: (stats.rows[0].last_km - stats.rows[0].first_km) || 0
      },
      consumption: {
        avg_km_per_liter: parseFloat(consumption.rows[0]?.avg_consumption_km_per_liter) || null,
        records_used: parseInt(consumption.rows[0]?.consumption_records) || 0
      },
      by_fuel_type: byFuelType.rows.map(row => ({
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
