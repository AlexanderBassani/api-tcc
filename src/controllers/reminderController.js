const pool = require('../config/database');
const logger = require('../config/logger');

// Criar novo lembrete
const createReminder = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      vehicle_id,
      type,
      title,
      description,
      remind_at_km,
      remind_at_date,
      is_recurring,
      recurrence_km,
      recurrence_months
    } = req.body;

    // Verificar se o veículo pertence ao usuário
    const vehicleCheck = await pool.query(
      'SELECT id FROM vehicles WHERE id = $1 AND user_id = $2',
      [vehicle_id, userId]
    );

    if (vehicleCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Veículo não encontrado',
        message: 'Veículo não existe ou não pertence ao usuário'
      });
    }

    // Criar lembrete
    const result = await pool.query(
      `INSERT INTO reminders (
        vehicle_id, type, title, description,
        remind_at_km, remind_at_date,
        is_recurring, recurrence_km, recurrence_months
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        vehicle_id,
        type,
        title,
        description || null,
        remind_at_km || null,
        remind_at_date || null,
        is_recurring || false,
        recurrence_km || null,
        recurrence_months || null
      ]
    );

    logger.info('Reminder created', {
      reminderId: result.rows[0].id,
      userId,
      vehicleId: vehicle_id
    });

    res.status(201).json({
      success: true,
      message: 'Lembrete criado com sucesso',
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Error creating reminder', {
      userId: req.user.id,
      error: error.message,
      stack: error.stack
    });

    // Tratar erros de constraint
    if (error.code === '23514') { // check constraint violation
      return res.status(400).json({
        error: 'Dados inválidos',
        message: 'Verifique se pelo menos um gatilho (km ou data) foi fornecido e se os dados estão corretos'
      });
    }

    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível criar o lembrete'
    });
  }
};

// Listar lembretes do usuário
const getReminders = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, type, vehicle_id } = req.query;

    let query = `
      SELECT r.*, v.brand, v.model, v.plate, v.current_km
      FROM reminders r
      INNER JOIN vehicles v ON r.vehicle_id = v.id
      WHERE v.user_id = $1
    `;
    const params = [userId];
    let paramCount = 1;

    // Filtros opcionais
    if (status) {
      paramCount++;
      query += ` AND r.status = $${paramCount}`;
      params.push(status);
    }

    if (type) {
      paramCount++;
      query += ` AND r.type = $${paramCount}`;
      params.push(type);
    }

    if (vehicle_id) {
      paramCount++;
      query += ` AND r.vehicle_id = $${paramCount}`;
      params.push(vehicle_id);
    }

    query += ' ORDER BY r.created_at DESC';

    const result = await pool.query(query, params);

    logger.info('Reminders retrieved', {
      userId,
      count: result.rows.length,
      filters: { status, type, vehicle_id }
    });

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    logger.error('Error retrieving reminders', {
      userId: req.user.id,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível buscar os lembretes'
    });
  }
};

// Buscar lembrete específico
const getReminderById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT r.*, v.brand, v.model, v.plate, v.current_km
       FROM reminders r
       INNER JOIN vehicles v ON r.vehicle_id = v.id
       WHERE r.id = $1 AND v.user_id = $2`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Lembrete não encontrado',
        message: 'Lembrete não existe ou não pertence ao usuário'
      });
    }

    logger.info('Reminder retrieved by ID', {
      reminderId: id,
      userId
    });

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Error retrieving reminder by ID', {
      reminderId: req.params.id,
      userId: req.user.id,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível buscar o lembrete'
    });
  }
};

// Atualizar lembrete
const updateReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const {
      type,
      title,
      description,
      remind_at_km,
      remind_at_date,
      is_recurring,
      recurrence_km,
      recurrence_months
    } = req.body;

    // Verificar se o lembrete pertence ao usuário
    const reminderCheck = await pool.query(
      `SELECT r.id
       FROM reminders r
       INNER JOIN vehicles v ON r.vehicle_id = v.id
       WHERE r.id = $1 AND v.user_id = $2`,
      [id, userId]
    );

    if (reminderCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Lembrete não encontrado',
        message: 'Lembrete não existe ou não pertence ao usuário'
      });
    }

    // Atualizar lembrete
    const result = await pool.query(
      `UPDATE reminders SET
        type = COALESCE($1, type),
        title = COALESCE($2, title),
        description = COALESCE($3, description),
        remind_at_km = COALESCE($4, remind_at_km),
        remind_at_date = COALESCE($5, remind_at_date),
        is_recurring = COALESCE($6, is_recurring),
        recurrence_km = COALESCE($7, recurrence_km),
        recurrence_months = COALESCE($8, recurrence_months)
       WHERE id = $9
       RETURNING *`,
      [
        type,
        title,
        description,
        remind_at_km,
        remind_at_date,
        is_recurring,
        recurrence_km,
        recurrence_months,
        id
      ]
    );

    logger.info('Reminder updated', {
      reminderId: id,
      userId
    });

    res.json({
      success: true,
      message: 'Lembrete atualizado com sucesso',
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Error updating reminder', {
      reminderId: req.params.id,
      userId: req.user.id,
      error: error.message,
      stack: error.stack
    });

    // Tratar erros de constraint
    if (error.code === '23514') {
      return res.status(400).json({
        error: 'Dados inválidos',
        message: 'Verifique se pelo menos um gatilho (km ou data) está presente e se os dados estão corretos'
      });
    }

    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível atualizar o lembrete'
    });
  }
};

// Excluir lembrete
const deleteReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verificar se o lembrete pertence ao usuário
    const reminderCheck = await pool.query(
      `SELECT r.id, r.title
       FROM reminders r
       INNER JOIN vehicles v ON r.vehicle_id = v.id
       WHERE r.id = $1 AND v.user_id = $2`,
      [id, userId]
    );

    if (reminderCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Lembrete não encontrado',
        message: 'Lembrete não existe ou não pertence ao usuário'
      });
    }

    await pool.query('DELETE FROM reminders WHERE id = $1', [id]);

    logger.info('Reminder deleted', {
      reminderId: id,
      userId,
      title: reminderCheck.rows[0].title
    });

    res.json({
      success: true,
      message: 'Lembrete excluído com sucesso'
    });
  } catch (error) {
    logger.error('Error deleting reminder', {
      reminderId: req.params.id,
      userId: req.user.id,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível excluir o lembrete'
    });
  }
};

// Marcar lembrete como concluído
const markAsCompleted = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verificar se o lembrete pertence ao usuário
    const reminderCheck = await pool.query(
      `SELECT r.id
       FROM reminders r
       INNER JOIN vehicles v ON r.vehicle_id = v.id
       WHERE r.id = $1 AND v.user_id = $2`,
      [id, userId]
    );

    if (reminderCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Lembrete não encontrado',
        message: 'Lembrete não existe ou não pertence ao usuário'
      });
    }

    // Atualizar status para completed
    const result = await pool.query(
      `UPDATE reminders
       SET status = 'completed', completed_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    logger.info('Reminder marked as completed', {
      reminderId: id,
      userId
    });

    res.json({
      success: true,
      message: 'Lembrete marcado como concluído',
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Error marking reminder as completed', {
      reminderId: req.params.id,
      userId: req.user.id,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível marcar o lembrete como concluído'
    });
  }
};

// Marcar lembrete como descartado
const markAsDismissed = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verificar se o lembrete pertence ao usuário
    const reminderCheck = await pool.query(
      `SELECT r.id
       FROM reminders r
       INNER JOIN vehicles v ON r.vehicle_id = v.id
       WHERE r.id = $1 AND v.user_id = $2`,
      [id, userId]
    );

    if (reminderCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Lembrete não encontrado',
        message: 'Lembrete não existe ou não pertence ao usuário'
      });
    }

    // Atualizar status para dismissed
    const result = await pool.query(
      `UPDATE reminders
       SET status = 'dismissed'
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    logger.info('Reminder marked as dismissed', {
      reminderId: id,
      userId
    });

    res.json({
      success: true,
      message: 'Lembrete descartado',
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Error marking reminder as dismissed', {
      reminderId: req.params.id,
      userId: req.user.id,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível descartar o lembrete'
    });
  }
};

// Listar lembretes pendentes (próximos de vencer)
const getPendingReminders = async (req, res) => {
  try {
    const userId = req.user.id;

    // Buscar lembretes pendentes que:
    // 1. Têm remind_at_date <= hoje + 30 dias OU
    // 2. Têm remind_at_km <= current_km do veículo + margem de 500km
    const result = await pool.query(
      `SELECT r.*, v.brand, v.model, v.plate, v.current_km,
        CASE
          WHEN r.remind_at_date IS NOT NULL AND r.remind_at_date <= CURRENT_DATE + INTERVAL '30 days'
            THEN r.remind_at_date - CURRENT_DATE
          ELSE NULL
        END as days_until_due,
        CASE
          WHEN r.remind_at_km IS NOT NULL AND v.current_km IS NOT NULL
            THEN r.remind_at_km - v.current_km
          ELSE NULL
        END as km_until_due
       FROM reminders r
       INNER JOIN vehicles v ON r.vehicle_id = v.id
       WHERE v.user_id = $1 AND r.status = 'pending'
       AND (
         (r.remind_at_date IS NOT NULL AND r.remind_at_date <= CURRENT_DATE + INTERVAL '30 days') OR
         (r.remind_at_km IS NOT NULL AND v.current_km IS NOT NULL AND r.remind_at_km <= v.current_km + 500)
       )
       ORDER BY
         CASE WHEN r.remind_at_date IS NOT NULL THEN r.remind_at_date ELSE '9999-12-31' END ASC,
         CASE WHEN r.remind_at_km IS NOT NULL THEN r.remind_at_km ELSE 999999999 END ASC`,
      [userId]
    );

    logger.info('Pending reminders retrieved', {
      userId,
      count: result.rows.length
    });

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    logger.error('Error retrieving pending reminders', {
      userId: req.user.id,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível buscar os lembretes pendentes'
    });
  }
};

// Listar lembretes de um veículo específico
const getRemindersByVehicle = async (req, res) => {
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
      `SELECT r.*, v.brand, v.model, v.plate, v.current_km
       FROM reminders r
       INNER JOIN vehicles v ON r.vehicle_id = v.id
       WHERE r.vehicle_id = $1
       ORDER BY r.created_at DESC`,
      [vehicleId]
    );

    logger.info('Reminders retrieved by vehicle', {
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
    logger.error('Error retrieving reminders by vehicle', {
      vehicleId: req.params.vehicleId,
      userId: req.user.id,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível buscar os lembretes do veículo'
    });
  }
};

module.exports = {
  createReminder,
  getReminders,
  getReminderById,
  updateReminder,
  deleteReminder,
  markAsCompleted,
  markAsDismissed,
  getPendingReminders,
  getRemindersByVehicle
};
