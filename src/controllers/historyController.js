const pool = require('../config/database');
const logger = require('../config/logger');

/**
 * @desc    Get unified history timeline (maintenances + fuel records)
 * @route   GET /api/history
 * @access  Private
 */
const getHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      vehicle_id,
      type = 'all',
      category,
      fuel_type,
      start_date,
      end_date,
      min_cost,
      max_cost,
      sort_by = 'date',
      sort_order = 'desc',
      limit = 50,
      offset = 0
    } = req.query;

    // Build WHERE conditions
    const conditions = [];
    const params = [userId];
    let paramIndex = 2;

    if (vehicle_id) {
      conditions.push(`v.id = $${paramIndex}`);
      params.push(vehicle_id);
      paramIndex++;
    }

    // Date range filter for maintenances
    let maintenanceDateFilter = '';
    if (start_date) {
      maintenanceDateFilter += `AND m.service_date >= $${paramIndex}`;
      params.push(start_date);
      paramIndex++;
      if (end_date) {
        maintenanceDateFilter += ` AND m.service_date <= $${paramIndex}`;
        params.push(end_date);
        paramIndex++;
      }
    } else if (end_date) {
      maintenanceDateFilter += `AND m.service_date <= $${paramIndex}`;
      params.push(end_date);
      paramIndex++;
    }

    // Date range filter for fuel records
    let fuelDateFilter = '';
    if (start_date) {
      fuelDateFilter += `AND fr.date >= $${paramIndex - (end_date ? 2 : 1)}`;
      if (end_date) {
        fuelDateFilter += ` AND fr.date <= $${paramIndex - 1}`;
      }
    } else if (end_date) {
      fuelDateFilter += `AND fr.date <= $${paramIndex - 1}`;
    }

    // Cost range filter for maintenances
    let maintenanceCostFilter = '';
    if (min_cost) {
      maintenanceCostFilter += `AND m.cost >= $${paramIndex}`;
      params.push(min_cost);
      paramIndex++;
      if (max_cost) {
        maintenanceCostFilter += ` AND m.cost <= $${paramIndex}`;
        params.push(max_cost);
        paramIndex++;
      }
    } else if (max_cost) {
      maintenanceCostFilter += `AND m.cost <= $${paramIndex}`;
      params.push(max_cost);
      paramIndex++;
    }

    // Cost range filter for fuel records
    let fuelCostFilter = '';
    if (min_cost) {
      fuelCostFilter += `AND fr.total_cost >= $${paramIndex - (max_cost ? 2 : 1)}`;
      if (max_cost) {
        fuelCostFilter += ` AND fr.total_cost <= $${paramIndex - 1}`;
      }
    } else if (max_cost) {
      fuelCostFilter += `AND fr.total_cost <= $${paramIndex - 1}`;
    }

    // Build where clause for vehicle filter only
    const whereClause = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';

    // Build category filter for maintenances
    const categoryFilter = category ? `AND m.category = '${category}'` : '';

    // Build fuel_type filter for fuel records
    const fuelTypeFilter = fuel_type ? `AND fr.fuel_type = '${fuel_type}'` : '';

    // Determine ORDER BY clause
    let orderByClause = '';
    switch (sort_by) {
      case 'km':
        orderByClause = `ORDER BY km_field ${sort_order.toUpperCase()}`;
        break;
      case 'cost':
        orderByClause = `ORDER BY cost_field ${sort_order.toUpperCase()}`;
        break;
      case 'date':
      default:
        orderByClause = `ORDER BY date_field ${sort_order.toUpperCase()}`;
        break;
    }

    // Build the unified query
    let unifiedQuery = '';

    // Maintenance query (if type is 'all' or 'maintenance')
    const maintenanceQuery = type === 'all' || type === 'maintenance' ? `
      SELECT
        m.id,
        'maintenance' as type,
        v.id as vehicle_id,
        CONCAT(v.brand, ' ', v.model, ' ', v.year) as vehicle_name,
        m.service_date as date_field,
        m.km_at_service as km_field,
        m.cost as cost_field,
        m.service_date as date,
        m.km_at_service as km,
        m.cost,
        m.description,
        m.category,
        COALESCE(sp.name, 'N/A') as service_provider,
        CASE WHEN m.invoice_number IS NOT NULL THEN true ELSE false END as is_completed,
        (SELECT COUNT(*) FROM maintenance_attachments ma WHERE ma.maintenance_id = m.id) as attachments_count,
        NULL::numeric as liters,
        NULL::numeric as price_per_liter,
        NULL::varchar as fuel_type,
        NULL::boolean as is_full_tank,
        NULL::varchar as gas_station,
        NULL::numeric as consumption
      FROM maintenances m
      JOIN vehicles v ON m.vehicle_id = v.id
      LEFT JOIN service_providers sp ON m.service_provider_id = sp.id
      WHERE v.user_id = $1
        ${categoryFilter}
        ${whereClause}
        ${maintenanceDateFilter}
        ${maintenanceCostFilter}
    ` : '';

    // Fuel record query (if type is 'all' or 'fuel')
    const fuelQuery = type === 'all' || type === 'fuel' ? `
      SELECT
        fr.id,
        'fuel' as type,
        v.id as vehicle_id,
        CONCAT(v.brand, ' ', v.model, ' ', v.year) as vehicle_name,
        fr.date as date_field,
        fr.km as km_field,
        fr.total_cost as cost_field,
        fr.date,
        fr.km,
        fr.total_cost as cost,
        NULL::varchar as description,
        NULL::varchar as category,
        NULL::varchar as service_provider,
        NULL::boolean as is_completed,
        NULL::integer as attachments_count,
        fr.liters,
        fr.price_per_liter,
        fr.fuel_type,
        fr.is_full_tank,
        COALESCE(fr.gas_station, 'N/A') as gas_station,
        (
          SELECT
            CASE
              WHEN prev_fr.liters > 0 AND prev_fr.is_full_tank = true
              THEN ROUND((fr.km - prev_fr.km)::numeric / prev_fr.liters, 1)
              ELSE NULL
            END
          FROM fuel_records prev_fr
          WHERE prev_fr.vehicle_id = fr.vehicle_id
            AND prev_fr.date < fr.date
            AND prev_fr.is_full_tank = true
          ORDER BY prev_fr.date DESC
          LIMIT 1
        ) as consumption
      FROM fuel_records fr
      JOIN vehicles v ON fr.vehicle_id = v.id
      WHERE v.user_id = $1
        ${fuelTypeFilter}
        ${whereClause}
        ${fuelDateFilter}
        ${fuelCostFilter}
    ` : '';

    // Combine queries with UNION
    if (type === 'all') {
      unifiedQuery = `
        WITH combined_history AS (
          ${maintenanceQuery}
          UNION ALL
          ${fuelQuery}
        )
        SELECT * FROM combined_history
        ${orderByClause}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
    } else if (type === 'maintenance') {
      unifiedQuery = `
        ${maintenanceQuery}
        ${orderByClause}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
    } else if (type === 'fuel') {
      unifiedQuery = `
        ${fuelQuery}
        ${orderByClause}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
    }

    params.push(parseInt(limit), parseInt(offset));

    // Build WHERE conditions for count queries
    const countConditions = [];
    if (vehicle_id) {
      countConditions.push(`v.id = $${vehicle_id ? 2 : ''}`);
    }

    // Add date and cost conditions for maintenance count
    const maintenanceCountConditions = [...countConditions];
    if (start_date && end_date) {
      const startIdx = vehicle_id ? 3 : 2;
      const endIdx = vehicle_id ? 4 : 3;
      maintenanceCountConditions.push(`m.service_date >= $${startIdx}`);
      maintenanceCountConditions.push(`m.service_date <= $${endIdx}`);
    } else if (start_date) {
      const idx = vehicle_id ? 3 : 2;
      maintenanceCountConditions.push(`m.service_date >= $${idx}`);
    } else if (end_date) {
      const idx = vehicle_id ? 3 : 2;
      maintenanceCountConditions.push(`m.service_date <= $${idx}`);
    }

    if (min_cost && max_cost) {
      const minIdx = vehicle_id ? (start_date || end_date ? (start_date && end_date ? 5 : 4) : 3) : (start_date || end_date ? (start_date && end_date ? 4 : 3) : 2);
      const maxIdx = minIdx + 1;
      maintenanceCountConditions.push(`m.cost >= $${minIdx}`);
      maintenanceCountConditions.push(`m.cost <= $${maxIdx}`);
    } else if (min_cost) {
      const idx = vehicle_id ? (start_date || end_date ? (start_date && end_date ? 5 : 4) : 3) : (start_date || end_date ? (start_date && end_date ? 4 : 3) : 2);
      maintenanceCountConditions.push(`m.cost >= $${idx}`);
    } else if (max_cost) {
      const idx = vehicle_id ? (start_date || end_date ? (start_date && end_date ? 5 : 4) : 3) : (start_date || end_date ? (start_date && end_date ? 4 : 3) : 2);
      maintenanceCountConditions.push(`m.cost <= $${idx}`);
    }

    const maintenanceCountWhere = maintenanceCountConditions.length > 0 ? `AND ${maintenanceCountConditions.join(' AND ')}` : '';

    // Add date and cost conditions for fuel count
    const fuelCountConditions = [...countConditions];
    if (start_date && end_date) {
      const startIdx = vehicle_id ? 3 : 2;
      const endIdx = vehicle_id ? 4 : 3;
      fuelCountConditions.push(`fr.date >= $${startIdx}`);
      fuelCountConditions.push(`fr.date <= $${endIdx}`);
    } else if (start_date) {
      const idx = vehicle_id ? 3 : 2;
      fuelCountConditions.push(`fr.date >= $${idx}`);
    } else if (end_date) {
      const idx = vehicle_id ? 3 : 2;
      fuelCountConditions.push(`fr.date <= $${idx}`);
    }

    if (min_cost && max_cost) {
      const minIdx = vehicle_id ? (start_date || end_date ? (start_date && end_date ? 5 : 4) : 3) : (start_date || end_date ? (start_date && end_date ? 4 : 3) : 2);
      const maxIdx = minIdx + 1;
      fuelCountConditions.push(`fr.total_cost >= $${minIdx}`);
      fuelCountConditions.push(`fr.total_cost <= $${maxIdx}`);
    } else if (min_cost) {
      const idx = vehicle_id ? (start_date || end_date ? (start_date && end_date ? 5 : 4) : 3) : (start_date || end_date ? (start_date && end_date ? 4 : 3) : 2);
      fuelCountConditions.push(`fr.total_cost >= $${idx}`);
    } else if (max_cost) {
      const idx = vehicle_id ? (start_date || end_date ? (start_date && end_date ? 5 : 4) : 3) : (start_date || end_date ? (start_date && end_date ? 4 : 3) : 2);
      fuelCountConditions.push(`fr.total_cost <= $${idx}`);
    }

    const fuelCountWhere = fuelCountConditions.length > 0 ? `AND ${fuelCountConditions.join(' AND ')}` : '';

    // Get total count for pagination
    let countQuery = '';
    if (type === 'all') {
      countQuery = `
        SELECT
          (SELECT COUNT(*) FROM maintenances m
           JOIN vehicles v ON m.vehicle_id = v.id
           WHERE v.user_id = $1 ${categoryFilter} ${maintenanceCountWhere}) +
          (SELECT COUNT(*) FROM fuel_records fr
           JOIN vehicles v ON fr.vehicle_id = v.id
           WHERE v.user_id = $1 ${fuelTypeFilter} ${fuelCountWhere}) as total
      `;
    } else if (type === 'maintenance') {
      countQuery = `
        SELECT COUNT(*) as total
        FROM maintenances m
        JOIN vehicles v ON m.vehicle_id = v.id
        WHERE v.user_id = $1 ${categoryFilter} ${maintenanceCountWhere}
      `;
    } else if (type === 'fuel') {
      countQuery = `
        SELECT COUNT(*) as total
        FROM fuel_records fr
        JOIN vehicles v ON fr.vehicle_id = v.id
        WHERE v.user_id = $1 ${fuelTypeFilter} ${fuelCountWhere}
      `;
    }

    const countParams = params.slice(0, paramIndex - 1);

    // Execute queries
    const [itemsResult, countResult] = await Promise.all([
      pool.query(unifiedQuery, params),
      pool.query(countQuery, countParams)
    ]);

    const items = itemsResult.rows;
    const total = parseInt(countResult.rows[0].total);

    // Format response
    res.json({
      success: true,
      data: {
        items,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          has_more: (parseInt(offset) + parseInt(limit)) < total
        },
        filters_applied: {
          vehicle_id: vehicle_id ? parseInt(vehicle_id) : null,
          type,
          category: category || null,
          fuel_type: fuel_type || null,
          start_date: start_date || null,
          end_date: end_date || null,
          min_cost: min_cost ? parseFloat(min_cost) : null,
          max_cost: max_cost ? parseFloat(max_cost) : null,
          sort_by,
          sort_order
        }
      }
    });

  } catch (error) {
    logger.error('Error getting history:', error);
    res.status(500).json({
      error: 'Erro ao buscar histórico',
      message: error.message
    });
  }
};

/**
 * @desc    Get advanced statistics for a period
 * @route   GET /api/history/statistics
 * @access  Private
 */
const getStatistics = async (req, res) => {
  try {
    const userId = req.user.id;
    const { vehicle_id, start_date, end_date, period } = req.query;

    // Determine date range based on period
    let startDate, endDate;
    const now = new Date();
    endDate = end_date || now.toISOString().split('T')[0];

    if (period) {
      switch (period) {
        case 'last_month':
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).toISOString().split('T')[0];
          break;
        case 'last_3_months':
          startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()).toISOString().split('T')[0];
          break;
        case 'last_6_months':
          startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()).toISOString().split('T')[0];
          break;
        case 'last_year':
          startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString().split('T')[0];
          break;
        case 'all_time':
          startDate = '2000-01-01';
          break;
        default:
          startDate = start_date || new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()).toISOString().split('T')[0];
      }
    } else {
      startDate = start_date || new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()).toISOString().split('T')[0];
    }

    const params = [userId, startDate, endDate];
    let paramIndex = 4;
    const vehicleFilter = vehicle_id ? `AND v.id = $${paramIndex}` : '';
    const vehicleFilter2 = vehicle_id ? `AND v2.id = $${paramIndex}` : '';
    if (vehicle_id) {
      params.push(vehicle_id);
      paramIndex++;
    }

    const statsQuery = `
      WITH period_stats AS (
        SELECT
          $2::date as start_date,
          $3::date as end_date,
          ($3::date - $2::date) as days,
          -- Calculate km traveled
          COALESCE((
            SELECT MAX(km) - MIN(km)
            FROM (
              SELECT km FROM fuel_records fr
              JOIN vehicles v ON fr.vehicle_id = v.id
              WHERE v.user_id = $1 AND fr.date BETWEEN $2 AND $3 ${vehicleFilter}
              UNION ALL
              SELECT km_at_service as km FROM maintenances m
              JOIN vehicles v ON m.vehicle_id = v.id
              WHERE v.user_id = $1 AND m.service_date BETWEEN $2 AND $3 AND m.km_at_service IS NOT NULL ${vehicleFilter}
            ) km_data
          ), 0) as km_traveled
      ),
      cost_stats AS (
        SELECT
          (SELECT COALESCE(SUM(cost), 0) FROM maintenances m
           JOIN vehicles v ON m.vehicle_id = v.id
           WHERE v.user_id = $1 AND m.service_date BETWEEN $2 AND $3 ${vehicleFilter}) as maintenance_cost,
          (SELECT COALESCE(SUM(total_cost), 0) FROM fuel_records fr
           JOIN vehicles v ON fr.vehicle_id = v.id
           WHERE v.user_id = $1 AND fr.date BETWEEN $2 AND $3 ${vehicleFilter}) as fuel_cost,
          (SELECT COALESCE(SUM(cost), 0) FROM maintenances m
           JOIN vehicles v ON m.vehicle_id = v.id
           WHERE v.user_id = $1 AND m.service_date BETWEEN $2 AND $3 ${vehicleFilter}) +
          (SELECT COALESCE(SUM(total_cost), 0) FROM fuel_records fr
           JOIN vehicles v ON fr.vehicle_id = v.id
           WHERE v.user_id = $1 AND fr.date BETWEEN $2 AND $3 ${vehicleFilter}) as total_cost
      ),
      maintenance_stats AS (
        SELECT
          COUNT(*)::int as total_services,
          COALESCE(AVG(cost), 0) as average_cost,
          -- By category
          COUNT(*) FILTER (WHERE category = 'preventive')::int as preventive_count,
          COALESCE(SUM(cost) FILTER (WHERE category = 'preventive'), 0) as preventive_cost,
          COUNT(*) FILTER (WHERE category = 'corrective')::int as corrective_count,
          COALESCE(SUM(cost) FILTER (WHERE category = 'corrective'), 0) as corrective_cost,
          COUNT(*) FILTER (WHERE category = 'inspection')::int as inspection_count,
          COALESCE(SUM(cost) FILTER (WHERE category = 'inspection'), 0) as inspection_cost,
          COUNT(*) FILTER (WHERE category = 'other')::int as other_count,
          COALESCE(SUM(cost) FILTER (WHERE category = 'other'), 0) as other_cost,
          -- Most expensive
          (SELECT m2.description FROM maintenances m2
           JOIN vehicles v2 ON m2.vehicle_id = v2.id
           WHERE v2.user_id = $1 AND m2.service_date BETWEEN $2 AND $3 ${vehicleFilter2}
           ORDER BY m2.cost DESC LIMIT 1) as most_expensive_description,
          (SELECT m2.cost FROM maintenances m2
           JOIN vehicles v2 ON m2.vehicle_id = v2.id
           WHERE v2.user_id = $1 AND m2.service_date BETWEEN $2 AND $3 ${vehicleFilter2}
           ORDER BY m2.cost DESC LIMIT 1) as most_expensive_cost,
          (SELECT m2.service_date FROM maintenances m2
           JOIN vehicles v2 ON m2.vehicle_id = v2.id
           WHERE v2.user_id = $1 AND m2.service_date BETWEEN $2 AND $3 ${vehicleFilter2}
           ORDER BY m2.cost DESC LIMIT 1) as most_expensive_date
        FROM maintenances m
        JOIN vehicles v ON m.vehicle_id = v.id
        WHERE v.user_id = $1 AND m.service_date BETWEEN $2 AND $3 ${vehicleFilter}
      ),
      fuel_stats AS (
        SELECT
          COUNT(*)::int as total_refuels,
          COALESCE(SUM(liters), 0) as total_liters,
          COALESCE(AVG(price_per_liter), 0) as average_price_per_liter,
          -- Calculate average consumption from full tanks
          (
            SELECT AVG(consumption)
            FROM (
              SELECT
                (lead_km - km)::numeric / NULLIF(lead_liters, 0) as consumption
              FROM (
                SELECT
                  km,
                  liters,
                  LEAD(km) OVER (PARTITION BY vehicle_id ORDER BY date DESC) as lead_km,
                  LEAD(liters) OVER (PARTITION BY vehicle_id ORDER BY date DESC) as lead_liters
                FROM fuel_records fr2
                JOIN vehicles v2 ON fr2.vehicle_id = v2.id
                WHERE v2.user_id = $1
                  AND fr2.date BETWEEN $2 AND $3
                  AND fr2.is_full_tank = true
                  ${vehicleFilter2}
                ORDER BY fr2.date DESC
              ) sub
              WHERE lead_km IS NOT NULL AND lead_liters > 0
            ) consumption_data
            WHERE consumption > 0 AND consumption < 50
          ) as average_consumption,
          -- By fuel type
          COUNT(*) FILTER (WHERE fuel_type = 'gasoline')::int as gasoline_count,
          COALESCE(SUM(liters) FILTER (WHERE fuel_type = 'gasoline'), 0) as gasoline_liters,
          COALESCE(SUM(total_cost) FILTER (WHERE fuel_type = 'gasoline'), 0) as gasoline_cost,
          COUNT(*) FILTER (WHERE fuel_type = 'ethanol')::int as ethanol_count,
          COALESCE(SUM(liters) FILTER (WHERE fuel_type = 'ethanol'), 0) as ethanol_liters,
          COALESCE(SUM(total_cost) FILTER (WHERE fuel_type = 'ethanol'), 0) as ethanol_cost,
          COUNT(*) FILTER (WHERE fuel_type = 'diesel')::int as diesel_count,
          COALESCE(SUM(liters) FILTER (WHERE fuel_type = 'diesel'), 0) as diesel_liters,
          COALESCE(SUM(total_cost) FILTER (WHERE fuel_type = 'diesel'), 0) as diesel_cost
        FROM fuel_records fr
        JOIN vehicles v ON fr.vehicle_id = v.id
        WHERE v.user_id = $1 AND fr.date BETWEEN $2 AND $3 ${vehicleFilter}
      )
      SELECT
        -- Period info
        ps.start_date,
        ps.end_date,
        ps.days,
        ps.km_traveled,
        -- Total costs
        cs.total_cost,
        cs.maintenance_cost,
        cs.fuel_cost,
        CASE WHEN cs.total_cost > 0 THEN ROUND((cs.maintenance_cost / cs.total_cost * 100)::numeric, 1) ELSE 0 END as maintenance_percentage,
        CASE WHEN cs.total_cost > 0 THEN ROUND((cs.fuel_cost / cs.total_cost * 100)::numeric, 1) ELSE 0 END as fuel_percentage,
        -- Cost per km
        CASE WHEN ps.km_traveled > 0 THEN ROUND((cs.total_cost / ps.km_traveled)::numeric, 2) ELSE 0 END as total_cost_per_km,
        CASE WHEN ps.km_traveled > 0 THEN ROUND((cs.maintenance_cost / ps.km_traveled)::numeric, 2) ELSE 0 END as maintenance_cost_per_km,
        CASE WHEN ps.km_traveled > 0 THEN ROUND((cs.fuel_cost / ps.km_traveled)::numeric, 2) ELSE 0 END as fuel_cost_per_km,
        -- Maintenance stats
        ms.total_services,
        ROUND(ms.average_cost::numeric, 2) as average_maintenance_cost,
        ms.preventive_count,
        ROUND(ms.preventive_cost::numeric, 2) as preventive_cost,
        ms.corrective_count,
        ROUND(ms.corrective_cost::numeric, 2) as corrective_cost,
        ms.inspection_count,
        ROUND(ms.inspection_cost::numeric, 2) as inspection_cost,
        ms.other_count,
        ROUND(ms.other_cost::numeric, 2) as other_cost,
        ms.most_expensive_description,
        ROUND(ms.most_expensive_cost::numeric, 2) as most_expensive_cost,
        ms.most_expensive_date,
        -- Fuel stats
        fs.total_refuels,
        ROUND(fs.total_liters::numeric, 1) as total_liters,
        ROUND(fs.average_consumption::numeric, 1) as average_consumption,
        ROUND(fs.average_price_per_liter::numeric, 2) as average_price_per_liter,
        fs.gasoline_count,
        ROUND(fs.gasoline_liters::numeric, 1) as gasoline_liters,
        ROUND(fs.gasoline_cost::numeric, 2) as gasoline_cost,
        fs.ethanol_count,
        ROUND(fs.ethanol_liters::numeric, 1) as ethanol_liters,
        ROUND(fs.ethanol_cost::numeric, 2) as ethanol_cost,
        fs.diesel_count,
        ROUND(fs.diesel_liters::numeric, 1) as diesel_liters,
        ROUND(fs.diesel_cost::numeric, 2) as diesel_cost
      FROM period_stats ps
      CROSS JOIN cost_stats cs
      CROSS JOIN maintenance_stats ms
      CROSS JOIN fuel_stats fs
    `;

    const result = await pool.query(statsQuery, params);
    const stats = result.rows[0];

    // Calculate projections based on last 6 months average
    const monthlyAverage = stats.total_cost / (stats.days / 30);
    const next3MonthsEstimate = monthlyAverage * 3;
    const next6MonthsEstimate = monthlyAverage * 6;

    // Determine cost per km trend (comparing first half vs second half of period)
    let costPerKmTrend = 'stable';
    if (stats.days >= 60) {
      const midDate = new Date(new Date(startDate).getTime() + (new Date(endDate).getTime() - new Date(startDate).getTime()) / 2).toISOString().split('T')[0];

      const vehicleFilterTrend = vehicle_id ? 'AND v.id = $5' : '';

      const trendQuery = `
        WITH first_half AS (
          SELECT COALESCE(SUM(m.cost), 0) + COALESCE(SUM(fr.total_cost), 0) as cost
          FROM vehicles v
          LEFT JOIN maintenances m ON m.vehicle_id = v.id AND m.service_date BETWEEN $2 AND $4
          LEFT JOIN fuel_records fr ON fr.vehicle_id = v.id AND fr.date BETWEEN $2 AND $4
          WHERE v.user_id = $1 ${vehicleFilterTrend}
        ),
        second_half AS (
          SELECT COALESCE(SUM(m.cost), 0) + COALESCE(SUM(fr.total_cost), 0) as cost
          FROM vehicles v
          LEFT JOIN maintenances m ON m.vehicle_id = v.id AND m.service_date BETWEEN $4 AND $3
          LEFT JOIN fuel_records fr ON fr.vehicle_id = v.id AND fr.date BETWEEN $4 AND $3
          WHERE v.user_id = $1 ${vehicleFilterTrend}
        )
        SELECT fh.cost as first_half_cost, sh.cost as second_half_cost
        FROM first_half fh, second_half sh
      `;

      const trendParams = vehicle_id ? [userId, startDate, endDate, midDate, vehicle_id] : [userId, startDate, endDate, midDate];
      const trendResult = await pool.query(trendQuery, trendParams);
      const { first_half_cost, second_half_cost } = trendResult.rows[0];

      const percentChange = first_half_cost > 0 ? ((second_half_cost - first_half_cost) / first_half_cost) * 100 : 0;

      if (percentChange > 10) {
        costPerKmTrend = 'increasing';
      } else if (percentChange < -10) {
        costPerKmTrend = 'decreasing';
      }
    }

    // Format response
    res.json({
      success: true,
      data: {
        period: {
          start_date: stats.start_date,
          end_date: stats.end_date,
          days: parseInt(stats.days),
          km_traveled: parseInt(stats.km_traveled)
        },
        total_costs: {
          total: parseFloat(stats.total_cost),
          maintenance: parseFloat(stats.maintenance_cost),
          fuel: parseFloat(stats.fuel_cost),
          maintenance_percentage: parseFloat(stats.maintenance_percentage),
          fuel_percentage: parseFloat(stats.fuel_percentage)
        },
        cost_per_km: {
          total: parseFloat(stats.total_cost_per_km),
          maintenance: parseFloat(stats.maintenance_cost_per_km),
          fuel: parseFloat(stats.fuel_cost_per_km)
        },
        maintenance_stats: {
          total_services: stats.total_services,
          average_cost: parseFloat(stats.average_maintenance_cost),
          by_category: {
            preventive: {
              count: stats.preventive_count,
              cost: parseFloat(stats.preventive_cost)
            },
            corrective: {
              count: stats.corrective_count,
              cost: parseFloat(stats.corrective_cost)
            },
            inspection: {
              count: stats.inspection_count,
              cost: parseFloat(stats.inspection_cost)
            },
            other: {
              count: stats.other_count,
              cost: parseFloat(stats.other_cost)
            }
          },
          most_expensive: stats.most_expensive_description ? {
            description: stats.most_expensive_description,
            cost: parseFloat(stats.most_expensive_cost),
            date: stats.most_expensive_date
          } : null
        },
        fuel_stats: {
          total_refuels: stats.total_refuels,
          total_liters: parseFloat(stats.total_liters),
          average_consumption: stats.average_consumption ? parseFloat(stats.average_consumption) : null,
          average_price_per_liter: parseFloat(stats.average_price_per_liter),
          by_fuel_type: {
            gasoline: {
              count: stats.gasoline_count,
              liters: parseFloat(stats.gasoline_liters),
              cost: parseFloat(stats.gasoline_cost)
            },
            ethanol: {
              count: stats.ethanol_count,
              liters: parseFloat(stats.ethanol_liters),
              cost: parseFloat(stats.ethanol_cost)
            },
            diesel: {
              count: stats.diesel_count,
              liters: parseFloat(stats.diesel_liters),
              cost: parseFloat(stats.diesel_cost)
            }
          }
        },
        projections: {
          monthly_average: parseFloat(monthlyAverage.toFixed(2)),
          next_3_months_estimate: parseFloat(next3MonthsEstimate.toFixed(2)),
          next_6_months_estimate: parseFloat(next6MonthsEstimate.toFixed(2)),
          cost_per_km_trend: costPerKmTrend
        }
      }
    });

  } catch (error) {
    logger.error('Error getting statistics:', error);
    res.status(500).json({
      error: 'Erro ao buscar estatísticas',
      message: error.message
    });
  }
};

/**
 * @desc    Compare vehicles statistics
 * @route   GET /api/history/compare-vehicles
 * @access  Private
 */
const compareVehicles = async (req, res) => {
  try {
    const userId = req.user.id;
    const { vehicle_ids, start_date, end_date, period } = req.query;

    // Parse vehicle_ids
    const vehicleIds = Array.isArray(vehicle_ids) ? vehicle_ids : vehicle_ids.split(',').map(id => parseInt(id.trim()));

    // Validate vehicle count
    if (vehicleIds.length < 2) {
      return res.status(400).json({
        error: 'Pelo menos 2 veículos são necessários para comparação',
        message: 'Forneça entre 2 e 5 IDs de veículos'
      });
    }

    if (vehicleIds.length > 5) {
      return res.status(400).json({
        error: 'Máximo de 5 veículos permitidos para comparação',
        message: 'Forneça entre 2 e 5 IDs de veículos'
      });
    }

    // Determine date range
    let startDate, endDate;
    const now = new Date();
    endDate = end_date || now.toISOString().split('T')[0];

    if (period) {
      switch (period) {
        case 'last_month':
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).toISOString().split('T')[0];
          break;
        case 'last_3_months':
          startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()).toISOString().split('T')[0];
          break;
        case 'last_6_months':
          startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()).toISOString().split('T')[0];
          break;
        case 'last_year':
          startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString().split('T')[0];
          break;
        case 'all_time':
          startDate = '2000-01-01';
          break;
        default:
          startDate = start_date || new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()).toISOString().split('T')[0];
      }
    } else {
      startDate = start_date || new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()).toISOString().split('T')[0];
    }

    // Verify that vehicles belong to the user
    const verifyQuery = `
      SELECT id FROM vehicles
      WHERE id = ANY($1) AND user_id = $2
    `;
    const verifyResult = await pool.query(verifyQuery, [vehicleIds, userId]);

    if (verifyResult.rows.length !== vehicleIds.length) {
      return res.status(403).json({
        error: 'Acesso negado',
        message: 'Um ou mais veículos não pertencem a você'
      });
    }

    // Query for each vehicle
    const comparisonQuery = `
      WITH vehicle_stats AS (
        SELECT
          v.id as vehicle_id,
          CONCAT(v.brand, ' ', v.model, ' ', v.year) as name,
          -- Calculate km traveled
          (
            SELECT
              CASE
                WHEN COUNT(*) > 0 THEN MAX(km) - MIN(km)
                ELSE 0
              END
            FROM (
              SELECT km FROM fuel_records WHERE vehicle_id = v.id AND date BETWEEN $2 AND $3
              UNION ALL
              SELECT km_at_service as km FROM maintenances WHERE vehicle_id = v.id AND service_date BETWEEN $2 AND $3 AND km_at_service IS NOT NULL
            ) km_data
          ) as km_traveled,
          -- Total costs
          COALESCE((SELECT SUM(cost) FROM maintenances WHERE vehicle_id = v.id AND service_date BETWEEN $2 AND $3), 0) as maintenance_cost,
          COALESCE((SELECT SUM(total_cost) FROM fuel_records WHERE vehicle_id = v.id AND date BETWEEN $2 AND $3), 0) as fuel_cost,
          COALESCE((SELECT SUM(cost) FROM maintenances WHERE vehicle_id = v.id AND service_date BETWEEN $2 AND $3), 0) +
          COALESCE((SELECT SUM(total_cost) FROM fuel_records WHERE vehicle_id = v.id AND date BETWEEN $2 AND $3), 0) as total_cost,
          -- Service counts
          (SELECT COUNT(*) FROM maintenances WHERE vehicle_id = v.id AND service_date BETWEEN $2 AND $3) +
          (SELECT COUNT(*) FROM fuel_records WHERE vehicle_id = v.id AND date BETWEEN $2 AND $3) as services_count,
          -- Average consumption
          (
            SELECT AVG(consumption)
            FROM (
              SELECT
                (lead_km - km)::numeric / NULLIF(lead_liters, 0) as consumption
              FROM (
                SELECT
                  km,
                  liters,
                  LEAD(km) OVER (ORDER BY date DESC) as lead_km,
                  LEAD(liters) OVER (ORDER BY date DESC) as lead_liters
                FROM fuel_records
                WHERE vehicle_id = v.id
                  AND date BETWEEN $2 AND $3
                  AND is_full_tank = true
                ORDER BY date DESC
              ) sub
              WHERE lead_km IS NOT NULL AND lead_liters > 0
            ) consumption_data
            WHERE consumption > 0 AND consumption < 50
          ) as average_consumption
        FROM vehicles v
        WHERE v.id = ANY($1) AND v.user_id = $4
      )
      SELECT
        vehicle_id,
        name,
        km_traveled,
        ROUND(total_cost::numeric, 2) as total_cost,
        CASE WHEN km_traveled > 0 THEN ROUND((total_cost / km_traveled)::numeric, 2) ELSE 0 END as cost_per_km,
        ROUND(maintenance_cost::numeric, 2) as maintenance_cost,
        ROUND(fuel_cost::numeric, 2) as fuel_cost,
        ROUND(average_consumption::numeric, 1) as average_consumption,
        services_count
      FROM vehicle_stats
      ORDER BY cost_per_km ASC
    `;

    const result = await pool.query(comparisonQuery, [vehicleIds, startDate, endDate, userId]);
    const vehicles = result.rows.map((v, index) => ({
      ...v,
      vehicle_id: parseInt(v.vehicle_id),
      km_traveled: parseInt(v.km_traveled),
      total_cost: parseFloat(v.total_cost),
      cost_per_km: parseFloat(v.cost_per_km),
      maintenance_cost: parseFloat(v.maintenance_cost),
      fuel_cost: parseFloat(v.fuel_cost),
      average_consumption: v.average_consumption ? parseFloat(v.average_consumption) : null,
      services_count: parseInt(v.services_count),
      efficiency_rank: index + 1
    }));

    // Find best performers
    const mostEconomical = vehicles.reduce((prev, curr) =>
      prev.cost_per_km < curr.cost_per_km ? prev : curr
    );

    const mostExpensive = vehicles.reduce((prev, curr) =>
      prev.cost_per_km > curr.cost_per_km ? prev : curr
    );

    const bestConsumption = vehicles
      .filter(v => v.average_consumption !== null)
      .reduce((prev, curr) =>
        (prev.average_consumption || 0) > (curr.average_consumption || 0) ? prev : curr
      , { average_consumption: null });

    res.json({
      success: true,
      data: {
        period: {
          start_date: startDate,
          end_date: endDate
        },
        vehicles,
        summary: {
          most_economical: {
            vehicle_id: mostEconomical.vehicle_id,
            name: mostEconomical.name,
            cost_per_km: mostEconomical.cost_per_km
          },
          most_expensive: {
            vehicle_id: mostExpensive.vehicle_id,
            name: mostExpensive.name,
            cost_per_km: mostExpensive.cost_per_km
          },
          best_consumption: bestConsumption.average_consumption ? {
            vehicle_id: bestConsumption.vehicle_id,
            name: bestConsumption.name,
            average_consumption: bestConsumption.average_consumption
          } : null
        }
      }
    });

  } catch (error) {
    logger.error('Error comparing vehicles:', error);
    res.status(500).json({
      error: 'Erro ao comparar veículos',
      message: error.message
    });
  }
};

module.exports = {
  getHistory,
  getStatistics,
  compareVehicles
};
