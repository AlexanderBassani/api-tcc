const pool = require('../config/database');
const logger = require('../config/logger');

/**
 * @desc    Get dashboard KPIs (Key Performance Indicators)
 * @route   GET /api/dashboard/kpis
 * @access  Private
 */
const getKPIs = async (req, res) => {
  try {
    const userId = req.user.id;
    const { vehicle_id } = req.query;

    // Query para obter os KPIs principais
    const kpisQuery = `
      WITH current_month AS (
        SELECT DATE_TRUNC('month', CURRENT_DATE) as start_date
      ),
      previous_month AS (
        SELECT DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') as start_date
      ),
      -- Total de veículos
      vehicles_stats AS (
        SELECT
          COUNT(*) FILTER (WHERE is_active = true) as total_vehicles,
          COUNT(*) FILTER (WHERE is_active = true AND created_at >= (SELECT start_date FROM current_month)) as vehicles_this_month,
          COUNT(*) FILTER (WHERE is_active = true AND created_at >= (SELECT start_date FROM previous_month) AND created_at < (SELECT start_date FROM current_month)) as vehicles_last_month
        FROM vehicles
        WHERE user_id = $1
          ${vehicle_id ? 'AND id = $2' : ''}
      ),
      -- Manutenções pendentes
      pending_maintenances AS (
        SELECT
          COUNT(*) FILTER (WHERE r.status = 'pending' AND (
            (r.remind_at_date IS NOT NULL AND r.remind_at_date <= CURRENT_DATE + INTERVAL '30 days') OR
            (r.remind_at_km IS NOT NULL AND v.current_km >= r.remind_at_km - 500)
          )) as pending_count,
          COUNT(*) FILTER (WHERE r.status = 'pending' AND r.created_at >= (SELECT start_date FROM current_month) AND (
            (r.remind_at_date IS NOT NULL AND r.remind_at_date <= CURRENT_DATE + INTERVAL '30 days') OR
            (r.remind_at_km IS NOT NULL AND v.current_km >= r.remind_at_km - 500)
          )) as pending_this_month,
          COUNT(*) FILTER (WHERE r.status = 'pending' AND r.created_at >= (SELECT start_date FROM previous_month) AND r.created_at < (SELECT start_date FROM current_month) AND (
            (r.remind_at_date IS NOT NULL AND r.remind_at_date <= CURRENT_DATE + INTERVAL '30 days') OR
            (r.remind_at_km IS NOT NULL AND v.current_km >= r.remind_at_km - 500)
          )) as pending_last_month
        FROM reminders r
        JOIN vehicles v ON r.vehicle_id = v.id
        WHERE v.user_id = $1
          ${vehicle_id ? 'AND v.id = $2' : ''}
      ),
      -- Abastecimentos do mês atual
      fuel_current_month AS (
        SELECT
          COUNT(*) as count,
          COALESCE(SUM(total_cost), 0) as total_cost
        FROM fuel_records fr
        JOIN vehicles v ON fr.vehicle_id = v.id
        WHERE v.user_id = $1
          AND fr.date >= (SELECT start_date FROM current_month)
          ${vehicle_id ? 'AND v.id = $2' : ''}
      ),
      -- Abastecimentos do mês anterior
      fuel_previous_month AS (
        SELECT
          COUNT(*) as count,
          COALESCE(SUM(total_cost), 0) as total_cost
        FROM fuel_records fr
        JOIN vehicles v ON fr.vehicle_id = v.id
        WHERE v.user_id = $1
          AND fr.date >= (SELECT start_date FROM previous_month)
          AND fr.date < (SELECT start_date FROM current_month)
          ${vehicle_id ? 'AND v.id = $2' : ''}
      ),
      -- Custo médio por km (últimos 3 meses)
      avg_cost_per_km AS (
        SELECT
          CASE
            WHEN SUM(fr.liters) > 0 THEN
              SUM(fr.total_cost) / NULLIF(SUM(fr.liters), 0)
            ELSE 0
          END as price_per_liter,
          CASE
            WHEN COUNT(*) FILTER (WHERE fr.is_full_tank = true) >= 2 THEN
              -- Calcular consumo médio apenas com tanques cheios consecutivos
              (SELECT AVG(consumption) FROM (
                SELECT
                  (lead_km - fr.km) / NULLIF(lead_liters, 0) as consumption
                FROM (
                  SELECT
                    fr.km,
                    fr.liters,
                    LEAD(fr.km) OVER (PARTITION BY fr.vehicle_id ORDER BY fr.date DESC) as lead_km,
                    LEAD(fr.liters) OVER (PARTITION BY fr.vehicle_id ORDER BY fr.date DESC) as lead_liters
                  FROM fuel_records fr
                  JOIN vehicles v ON fr.vehicle_id = v.id
                  WHERE v.user_id = $1
                    AND fr.date >= CURRENT_DATE - INTERVAL '3 months'
                    AND fr.is_full_tank = true
                    ${vehicle_id ? 'AND v.id = $2' : ''}
                  ORDER BY fr.date DESC
                ) sub
                WHERE lead_km IS NOT NULL AND lead_liters > 0
              ) consumption_data)
            ELSE NULL
          END as avg_consumption
        FROM fuel_records fr
        JOIN vehicles v ON fr.vehicle_id = v.id
        WHERE v.user_id = $1
          AND fr.date >= CURRENT_DATE - INTERVAL '3 months'
          ${vehicle_id ? 'AND v.id = $2' : ''}
      )
      SELECT
        -- Total de veículos
        vs.total_vehicles,
        vs.vehicles_this_month,
        vs.vehicles_last_month,
        CASE
          WHEN vs.vehicles_last_month > 0 THEN
            ROUND(((vs.vehicles_this_month - vs.vehicles_last_month)::numeric / vs.vehicles_last_month * 100), 1)
          ELSE 0
        END as vehicles_change_percent,
        -- Manutenções pendentes
        pm.pending_count,
        pm.pending_this_month,
        pm.pending_last_month,
        CASE
          WHEN pm.pending_last_month > 0 THEN
            ROUND(((pm.pending_this_month - pm.pending_last_month)::numeric / pm.pending_last_month * 100), 1)
          ELSE 0
        END as pending_change_percent,
        -- Abastecimentos do mês
        fcm.count as fuel_count_current,
        fcm.total_cost as fuel_cost_current,
        fpm.count as fuel_count_previous,
        fpm.total_cost as fuel_cost_previous,
        CASE
          WHEN fpm.count > 0 THEN
            ROUND(((fcm.count - fpm.count)::numeric / fpm.count * 100), 1)
          ELSE 0
        END as fuel_count_change_percent,
        -- Custo médio por km
        CASE
          WHEN ack.avg_consumption > 0 AND ack.price_per_liter > 0 THEN
            ROUND((ack.price_per_liter / ack.avg_consumption)::numeric, 2)
          ELSE 0
        END as avg_cost_per_km,
        ROUND(ack.avg_consumption::numeric, 2) as avg_consumption,
        ROUND(ack.price_per_liter::numeric, 2) as avg_price_per_liter
      FROM vehicles_stats vs
      CROSS JOIN pending_maintenances pm
      CROSS JOIN fuel_current_month fcm
      CROSS JOIN fuel_previous_month fpm
      CROSS JOIN avg_cost_per_km ack
    `;

    const params = vehicle_id ? [userId, vehicle_id] : [userId];
    const result = await pool.query(kpisQuery, params);

    if (result.rows.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          total_vehicles: 0,
          vehicles_change_percent: 0,
          pending_maintenances: 0,
          pending_change_percent: 0,
          fuel_records_this_month: 0,
          fuel_count_change_percent: 0,
          avg_cost_per_km: 0,
          avg_consumption: null,
          avg_price_per_liter: null
        }
      });
    }

    const kpis = result.rows[0];

    // Formatar resposta
    const response = {
      success: true,
      data: {
        total_vehicles: {
          value: parseInt(kpis.total_vehicles),
          change_this_month: parseInt(kpis.vehicles_this_month),
          change_percent: parseFloat(kpis.vehicles_change_percent)
        },
        pending_maintenances: {
          value: parseInt(kpis.pending_count),
          change_this_month: parseInt(kpis.pending_this_month) - parseInt(kpis.pending_last_month),
          change_percent: parseFloat(kpis.pending_change_percent)
        },
        fuel_records_this_month: {
          value: parseInt(kpis.fuel_count_current),
          change_percent: parseFloat(kpis.fuel_count_change_percent),
          total_cost: parseFloat(kpis.fuel_cost_current)
        },
        avg_cost_per_km: {
          value: parseFloat(kpis.avg_cost_per_km),
          avg_consumption: kpis.avg_consumption ? parseFloat(kpis.avg_consumption) : null,
          avg_price_per_liter: kpis.avg_price_per_liter ? parseFloat(kpis.avg_price_per_liter) : null
        }
      }
    };

    return res.status(200).json(response);

  } catch (error) {
    logger.error('Error fetching KPIs', {
      userId: req.user?.id,
      error: error.message,
      stack: error.stack
    });

    return res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível carregar os KPIs do dashboard'
    });
  }
};

/**
 * @desc    Get monthly expenses summary (combustível, manutenção, outros)
 * @route   GET /api/dashboard/monthly-expenses
 * @access  Private
 */
const getMonthlyExpenses = async (req, res) => {
  try {
    const userId = req.user.id;
    const { months = 6, vehicle_id } = req.query;

    // Validar número de meses
    const monthsLimit = Math.min(Math.max(parseInt(months) || 6, 1), 12);

    // Query para buscar despesas mensais dos últimos N meses
    let query = `
      WITH monthly_data AS (
        SELECT
          TO_CHAR(DATE_TRUNC('month', date), 'Mon') as month,
          EXTRACT(MONTH FROM date) as month_num,
          EXTRACT(YEAR FROM date) as year,
          'fuel' as type,
          SUM(total_cost) as amount
        FROM fuel_records fr
        JOIN vehicles v ON fr.vehicle_id = v.id
        WHERE v.user_id = $1
          AND date >= CURRENT_DATE - INTERVAL '${monthsLimit} months'
          ${vehicle_id ? 'AND v.id = $2' : ''}
        GROUP BY DATE_TRUNC('month', date), EXTRACT(MONTH FROM date), EXTRACT(YEAR FROM date)

        UNION ALL

        SELECT
          TO_CHAR(DATE_TRUNC('month', service_date), 'Mon') as month,
          EXTRACT(MONTH FROM service_date) as month_num,
          EXTRACT(YEAR FROM service_date) as year,
          'maintenance' as type,
          SUM(cost) as amount
        FROM maintenances m
        JOIN vehicles v ON m.vehicle_id = v.id
        WHERE v.user_id = $1
          AND service_date >= CURRENT_DATE - INTERVAL '${monthsLimit} months'
          ${vehicle_id ? 'AND v.id = $2' : ''}
        GROUP BY DATE_TRUNC('month', service_date), EXTRACT(MONTH FROM service_date), EXTRACT(YEAR FROM service_date)
      )
      SELECT
        month,
        month_num,
        year,
        SUM(CASE WHEN type = 'fuel' THEN amount ELSE 0 END) as fuel,
        SUM(CASE WHEN type = 'maintenance' THEN amount ELSE 0 END) as maintenance,
        0 as others
      FROM monthly_data
      GROUP BY month, month_num, year
      ORDER BY year, month_num
    `;

    const params = vehicle_id ? [userId, vehicle_id] : [userId];
    const result = await pool.query(query, params);

    // Calcular totais
    const totals = {
      fuel: 0,
      maintenance: 0,
      others: 0,
      total: 0
    };

    result.rows.forEach(row => {
      totals.fuel += parseFloat(row.fuel || 0);
      totals.maintenance += parseFloat(row.maintenance || 0);
      totals.others += parseFloat(row.others || 0);
    });

    totals.total = totals.fuel + totals.maintenance + totals.others;

    res.json({
      success: true,
      data: {
        monthly: result.rows.map(row => ({
          month: row.month,
          fuel: parseFloat(row.fuel || 0),
          maintenance: parseFloat(row.maintenance || 0),
          others: parseFloat(row.others || 0),
          total: parseFloat(row.fuel || 0) + parseFloat(row.maintenance || 0) + parseFloat(row.others || 0)
        })),
        totals: {
          fuel: parseFloat(totals.fuel.toFixed(2)),
          maintenance: parseFloat(totals.maintenance.toFixed(2)),
          others: parseFloat(totals.others.toFixed(2)),
          total: parseFloat(totals.total.toFixed(2)),
          fuel_percentage: totals.total > 0 ? parseFloat((totals.fuel / totals.total * 100).toFixed(1)) : 0,
          maintenance_percentage: totals.total > 0 ? parseFloat((totals.maintenance / totals.total * 100).toFixed(1)) : 0,
          others_percentage: totals.total > 0 ? parseFloat((totals.others / totals.total * 100).toFixed(1)) : 0
        }
      }
    });

    logger.info('Monthly expenses retrieved', { userId, months: monthsLimit, vehicleId: vehicle_id });
  } catch (error) {
    logger.error('Error getting monthly expenses', { error: error.message, userId: req.user.id });
    res.status(500).json({
      error: 'Erro ao buscar despesas mensais',
      message: error.message
    });
  }
};

/**
 * @desc    Get upcoming maintenances
 * @route   GET /api/dashboard/upcoming-maintenances
 * @access  Private
 */
const getUpcomingMaintenances = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 5, vehicle_id } = req.query;

    const limitNum = Math.min(Math.max(parseInt(limit) || 5, 1), 20);

    // Buscar lembretes pendentes ordenados por proximidade
    let query = `
      SELECT
        r.id,
        r.vehicle_id,
        r.title,
        r.description,
        r.remind_at_km,
        r.remind_at_date,
        r.type,
        v.brand,
        v.model,
        v.plate,
        v.current_km,
        CASE
          WHEN r.remind_at_date IS NOT NULL
          THEN r.remind_at_date - CURRENT_DATE
          ELSE NULL
        END as days_until,
        CASE
          WHEN r.remind_at_km IS NOT NULL
          THEN r.remind_at_km - v.current_km
          ELSE NULL
        END as km_until
      FROM reminders r
      JOIN vehicles v ON r.vehicle_id = v.id
      WHERE v.user_id = $1
        AND r.status = 'pending'
        AND v.is_active = TRUE
        ${vehicle_id ? 'AND v.id = $2' : ''}
        AND (
          (r.remind_at_date IS NOT NULL AND r.remind_at_date >= CURRENT_DATE)
          OR
          (r.remind_at_km IS NOT NULL AND r.remind_at_km >= v.current_km)
        )
      ORDER BY
        CASE
          WHEN r.remind_at_date IS NOT NULL THEN r.remind_at_date
          ELSE CURRENT_DATE + INTERVAL '1000 days'
        END ASC,
        CASE
          WHEN r.remind_at_km IS NOT NULL THEN (r.remind_at_km - v.current_km)
          ELSE 999999
        END ASC
      LIMIT $${vehicle_id ? '3' : '2'}
    `;

    const params = vehicle_id ? [userId, vehicle_id, limitNum] : [userId, limitNum];
    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows.map(row => ({
        id: row.id,
        vehicle_id: row.vehicle_id,
        vehicle: `${row.brand} ${row.model} - ${row.plate}`,
        title: row.title,
        description: row.description,
        type: row.type,
        date: row.remind_at_date,
        km: row.remind_at_km,
        days_until: row.days_until,
        km_until: row.km_until
      }))
    });

    logger.info('Upcoming maintenances retrieved', { userId, limit: limitNum, vehicleId: vehicle_id });
  } catch (error) {
    logger.error('Error getting upcoming maintenances', { error: error.message, userId: req.user.id });
    res.status(500).json({
      error: 'Erro ao buscar manutenções próximas',
      message: error.message
    });
  }
};

/**
 * @desc    Get recent activities (abastecimentos e manutenções)
 * @route   GET /api/dashboard/recent-activities
 * @access  Private
 */
const getRecentActivities = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 10, vehicle_id } = req.query;

    const limitNum = Math.min(Math.max(parseInt(limit) || 10, 1), 50);

    // Buscar atividades recentes (abastecimentos e manutenções)
    let query = `
      WITH activities AS (
        SELECT
          'fuel' as type,
          fr.id,
          fr.date as activity_date,
          fr.total_cost as cost,
          fr.liters,
          fr.fuel_type,
          v.brand,
          v.model,
          v.plate,
          NULL as description
        FROM fuel_records fr
        JOIN vehicles v ON fr.vehicle_id = v.id
        WHERE v.user_id = $1
          ${vehicle_id ? 'AND v.id = $2' : ''}

        UNION ALL

        SELECT
          'maintenance' as type,
          m.id,
          m.service_date as activity_date,
          m.cost,
          NULL as liters,
          NULL as fuel_type,
          v.brand,
          v.model,
          v.plate,
          m.description
        FROM maintenances m
        JOIN vehicles v ON m.vehicle_id = v.id
        WHERE v.user_id = $1
          ${vehicle_id ? 'AND v.id = $2' : ''}
      )
      SELECT *
      FROM activities
      ORDER BY activity_date DESC
      LIMIT $${vehicle_id ? '3' : '2'}
    `;

    const params = vehicle_id ? [userId, vehicle_id, limitNum] : [userId, limitNum];
    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows.map(row => ({
        id: row.id,
        type: row.type,
        vehicle: `${row.brand} ${row.model} - ${row.plate}`,
        date: row.activity_date,
        cost: parseFloat(row.cost || 0),
        description: row.type === 'fuel'
          ? `Abastecimento de ${parseFloat(row.liters).toFixed(1)}L`
          : row.description,
        fuel_type: row.fuel_type
      }))
    });

    logger.info('Recent activities retrieved', { userId, limit: limitNum, vehicleId: vehicle_id });
  } catch (error) {
    logger.error('Error getting recent activities', { error: error.message, userId: req.user.id });
    res.status(500).json({
      error: 'Erro ao buscar atividades recentes',
      message: error.message
    });
  }
};

/**
 * @desc    Get dashboard overview (summary of all data)
 * @route   GET /api/dashboard/overview
 * @access  Private
 */
const getDashboardOverview = async (req, res) => {
  try {
    const userId = req.user.id;
    const { vehicle_id } = req.query;

    // Executar múltiplas queries em paralelo para melhor performance
    const [expensesResult, activitiesResult, maintenancesResult, vehiclesResult] = await Promise.all([
      // Despesas dos últimos 6 meses
      pool.query(`
        WITH monthly_data AS (
          SELECT
            TO_CHAR(DATE_TRUNC('month', date), 'Mon') as month,
            EXTRACT(MONTH FROM date) as month_num,
            EXTRACT(YEAR FROM date) as year,
            'fuel' as type,
            SUM(total_cost) as amount
          FROM fuel_records fr
          JOIN vehicles v ON fr.vehicle_id = v.id
          WHERE v.user_id = $1
            AND date >= CURRENT_DATE - INTERVAL '6 months'
            ${vehicle_id ? 'AND v.id = $2' : ''}
          GROUP BY DATE_TRUNC('month', date), EXTRACT(MONTH FROM date), EXTRACT(YEAR FROM date)

          UNION ALL

          SELECT
            TO_CHAR(DATE_TRUNC('month', service_date), 'Mon') as month,
            EXTRACT(MONTH FROM service_date) as month_num,
            EXTRACT(YEAR FROM service_date) as year,
            'maintenance' as type,
            SUM(cost) as amount
          FROM maintenances m
          JOIN vehicles v ON m.vehicle_id = v.id
          WHERE v.user_id = $1
            AND service_date >= CURRENT_DATE - INTERVAL '6 months'
            ${vehicle_id ? 'AND v.id = $2' : ''}
          GROUP BY DATE_TRUNC('month', service_date), EXTRACT(MONTH FROM service_date), EXTRACT(YEAR FROM service_date)
        )
        SELECT
          month,
          month_num,
          year,
          SUM(CASE WHEN type = 'fuel' THEN amount ELSE 0 END) as fuel,
          SUM(CASE WHEN type = 'maintenance' THEN amount ELSE 0 END) as maintenance,
          0 as others
        FROM monthly_data
        GROUP BY month, month_num, year
        ORDER BY year, month_num
      `, vehicle_id ? [userId, vehicle_id] : [userId]),

      // Atividades recentes
      pool.query(`
        WITH activities AS (
          SELECT
            'fuel' as type,
            fr.id,
            fr.date as activity_date,
            fr.total_cost as cost,
            fr.liters,
            fr.fuel_type,
            v.brand,
            v.model,
            v.plate,
            NULL as description
          FROM fuel_records fr
          JOIN vehicles v ON fr.vehicle_id = v.id
          WHERE v.user_id = $1
            ${vehicle_id ? 'AND v.id = $2' : ''}

          UNION ALL

          SELECT
            'maintenance' as type,
            m.id,
            m.service_date as activity_date,
            m.cost,
            NULL as liters,
            NULL as fuel_type,
            v.brand,
            v.model,
            v.plate,
            m.description
          FROM maintenances m
          JOIN vehicles v ON m.vehicle_id = v.id
          WHERE v.user_id = $1
            ${vehicle_id ? 'AND v.id = $2' : ''}
        )
        SELECT *
        FROM activities
        ORDER BY activity_date DESC
        LIMIT 5
      `, vehicle_id ? [userId, vehicle_id] : [userId]),

      // Manutenções próximas
      pool.query(`
        SELECT
          r.id,
          r.vehicle_id,
          r.title,
          r.description,
          r.remind_at_km,
          r.remind_at_date,
          r.type,
          v.brand,
          v.model,
          v.plate,
          v.current_km,
          CASE
            WHEN r.remind_at_date IS NOT NULL
            THEN r.remind_at_date - CURRENT_DATE
            ELSE NULL
          END as days_until,
          CASE
            WHEN r.remind_at_km IS NOT NULL
            THEN r.remind_at_km - v.current_km
            ELSE NULL
          END as km_until
        FROM reminders r
        JOIN vehicles v ON r.vehicle_id = v.id
        WHERE v.user_id = $1
          AND r.status = 'pending'
          AND v.is_active = TRUE
          ${vehicle_id ? 'AND v.id = $2' : ''}
          AND (
            (r.remind_at_date IS NOT NULL AND r.remind_at_date >= CURRENT_DATE)
            OR
            (r.remind_at_km IS NOT NULL AND r.remind_at_km >= v.current_km)
          )
        ORDER BY
          CASE
            WHEN r.remind_at_date IS NOT NULL THEN r.remind_at_date
            ELSE CURRENT_DATE + INTERVAL '1000 days'
          END ASC,
          CASE
            WHEN r.remind_at_km IS NOT NULL THEN (r.remind_at_km - v.current_km)
            ELSE 999999
          END ASC
        LIMIT 3
      `, vehicle_id ? [userId, vehicle_id] : [userId]),

      // Total de veículos ativos
      pool.query(`
        SELECT COUNT(*) as total
        FROM vehicles
        WHERE user_id = $1 AND is_active = TRUE
        ${vehicle_id ? 'AND id = $2' : ''}
      `, vehicle_id ? [userId, vehicle_id] : [userId])
    ]);

    // Processar despesas mensais
    const monthly = expensesResult.rows.map(row => ({
      month: row.month,
      fuel: parseFloat(row.fuel || 0),
      maintenance: parseFloat(row.maintenance || 0),
      others: parseFloat(row.others || 0),
      total: parseFloat(row.fuel || 0) + parseFloat(row.maintenance || 0) + parseFloat(row.others || 0)
    }));

    const totals = {
      fuel: 0,
      maintenance: 0,
      others: 0,
      total: 0
    };

    monthly.forEach(row => {
      totals.fuel += row.fuel;
      totals.maintenance += row.maintenance;
      totals.others += row.others;
    });

    totals.total = totals.fuel + totals.maintenance + totals.others;

    // Processar atividades recentes
    const activities = activitiesResult.rows.map(row => ({
      id: row.id,
      type: row.type,
      vehicle: `${row.brand} ${row.model} - ${row.plate}`,
      date: row.activity_date,
      cost: parseFloat(row.cost || 0),
      description: row.type === 'fuel'
        ? `Abastecimento de ${parseFloat(row.liters).toFixed(1)}L`
        : row.description,
      fuel_type: row.fuel_type
    }));

    // Processar manutenções próximas
    const upcomingMaintenances = maintenancesResult.rows.map(row => ({
      id: row.id,
      vehicle_id: row.vehicle_id,
      vehicle: `${row.brand} ${row.model} - ${row.plate}`,
      title: row.title,
      description: row.description,
      type: row.type,
      date: row.remind_at_date,
      km: row.remind_at_km,
      days_until: row.days_until,
      km_until: row.km_until
    }));

    res.json({
      success: true,
      data: {
        expenses: {
          monthly,
          totals: {
            fuel: parseFloat(totals.fuel.toFixed(2)),
            maintenance: parseFloat(totals.maintenance.toFixed(2)),
            others: parseFloat(totals.others.toFixed(2)),
            total: parseFloat(totals.total.toFixed(2)),
            fuel_percentage: totals.total > 0 ? parseFloat((totals.fuel / totals.total * 100).toFixed(1)) : 0,
            maintenance_percentage: totals.total > 0 ? parseFloat((totals.maintenance / totals.total * 100).toFixed(1)) : 0,
            others_percentage: totals.total > 0 ? parseFloat((totals.others / totals.total * 100).toFixed(1)) : 0
          }
        },
        recent_activities: activities,
        upcoming_maintenances: upcomingMaintenances,
        total_vehicles: parseInt(vehiclesResult.rows[0].total)
      }
    });

    logger.info('Dashboard overview retrieved', { userId, vehicleId: vehicle_id });
  } catch (error) {
    logger.error('Error getting dashboard overview', { error: error.message, userId: req.user.id });
    res.status(500).json({
      error: 'Erro ao buscar visão geral do dashboard',
      message: error.message
    });
  }
};

module.exports = {
  getKPIs,
  getMonthlyExpenses,
  getUpcomingMaintenances,
  getRecentActivities,
  getDashboardOverview
};
