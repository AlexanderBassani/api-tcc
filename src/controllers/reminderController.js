const { AppDataSource } = require('../config/typeorm');
const logger = require('../config/logger');

const reminderRepository = AppDataSource.getRepository('Reminder');
const vehicleRepository = AppDataSource.getRepository('Vehicle');

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
    const vehicle = await vehicleRepository.findOne({
      where: { id: vehicle_id, user_id: userId },
      select: ['id']
    });

    if (!vehicle) {
      return res.status(404).json({
        error: 'Veículo não encontrado',
        message: 'Veículo não existe ou não pertence ao usuário'
      });
    }

    // Criar lembrete
    const reminder = reminderRepository.create({
      vehicle_id,
      type,
      title,
      description: description || null,
      remind_at_km: remind_at_km || null,
      remind_at_date: remind_at_date || null,
      is_recurring: is_recurring || false,
      recurrence_km: recurrence_km || null,
      recurrence_months: recurrence_months || null
    });

    const savedReminder = await reminderRepository.save(reminder);

    logger.info('Reminder created', {
      reminderId: savedReminder.id,
      userId,
      vehicleId: vehicle_id
    });

    res.status(201).json({
      success: true,
      message: 'Lembrete criado com sucesso',
      data: savedReminder
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

    const queryBuilder = reminderRepository
      .createQueryBuilder('r')
      .innerJoin('r.vehicle', 'v')
      .addSelect(['v.brand', 'v.model', 'v.plate', 'v.current_km'])
      .where('v.user_id = :userId', { userId });

    // Filtros opcionais
    if (status) {
      queryBuilder.andWhere('r.status = :status', { status });
    }

    if (type) {
      queryBuilder.andWhere('r.type = :type', { type });
    }

    if (vehicle_id) {
      queryBuilder.andWhere('r.vehicle_id = :vehicleId', { vehicleId: vehicle_id });
    }

    queryBuilder.orderBy('r.created_at', 'DESC');

    const reminders = await queryBuilder.getMany();

    logger.info('Reminders retrieved', {
      userId,
      count: reminders.length,
      filters: { status, type, vehicle_id }
    });

    res.json({
      success: true,
      data: reminders,
      count: reminders.length
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

    const reminder = await reminderRepository
      .createQueryBuilder('r')
      .innerJoin('r.vehicle', 'v')
      .addSelect(['v.brand', 'v.model', 'v.plate', 'v.current_km'])
      .where('r.id = :id', { id })
      .andWhere('v.user_id = :userId', { userId })
      .getOne();

    if (!reminder) {
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
      data: reminder
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
    const reminder = await reminderRepository
      .createQueryBuilder('r')
      .innerJoin('r.vehicle', 'v')
      .where('r.id = :id', { id })
      .andWhere('v.user_id = :userId', { userId })
      .select(['r.id'])
      .getOne();

    if (!reminder) {
      return res.status(404).json({
        error: 'Lembrete não encontrado',
        message: 'Lembrete não existe ou não pertence ao usuário'
      });
    }

    // Preparar dados para atualização
    const updateData = {};
    if (type !== undefined) updateData.type = type;
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (remind_at_km !== undefined) updateData.remind_at_km = remind_at_km;
    if (remind_at_date !== undefined) updateData.remind_at_date = remind_at_date;
    if (is_recurring !== undefined) updateData.is_recurring = is_recurring;
    if (recurrence_km !== undefined) updateData.recurrence_km = recurrence_km;
    if (recurrence_months !== undefined) updateData.recurrence_months = recurrence_months;

    // Atualizar lembrete
    await reminderRepository.update(id, updateData);

    const updatedReminder = await reminderRepository.findOne({ where: { id } });

    logger.info('Reminder updated', {
      reminderId: id,
      userId
    });

    res.json({
      success: true,
      message: 'Lembrete atualizado com sucesso',
      data: updatedReminder
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
    const reminder = await reminderRepository
      .createQueryBuilder('r')
      .innerJoin('r.vehicle', 'v')
      .where('r.id = :id', { id })
      .andWhere('v.user_id = :userId', { userId })
      .select(['r.id', 'r.title'])
      .getOne();

    if (!reminder) {
      return res.status(404).json({
        error: 'Lembrete não encontrado',
        message: 'Lembrete não existe ou não pertence ao usuário'
      });
    }

    await reminderRepository.delete(id);

    logger.info('Reminder deleted', {
      reminderId: id,
      userId,
      title: reminder.title
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
    const reminder = await reminderRepository
      .createQueryBuilder('r')
      .innerJoin('r.vehicle', 'v')
      .where('r.id = :id', { id })
      .andWhere('v.user_id = :userId', { userId })
      .select(['r.id'])
      .getOne();

    if (!reminder) {
      return res.status(404).json({
        error: 'Lembrete não encontrado',
        message: 'Lembrete não existe ou não pertence ao usuário'
      });
    }

    // Atualizar status para completed
    await reminderRepository.update(id, {
      status: 'completed',
      completed_at: new Date()
    });

    const updatedReminder = await reminderRepository.findOne({ where: { id } });

    logger.info('Reminder marked as completed', {
      reminderId: id,
      userId
    });

    res.json({
      success: true,
      message: 'Lembrete marcado como concluído',
      data: updatedReminder
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
    const reminder = await reminderRepository
      .createQueryBuilder('r')
      .innerJoin('r.vehicle', 'v')
      .where('r.id = :id', { id })
      .andWhere('v.user_id = :userId', { userId })
      .select(['r.id'])
      .getOne();

    if (!reminder) {
      return res.status(404).json({
        error: 'Lembrete não encontrado',
        message: 'Lembrete não existe ou não pertence ao usuário'
      });
    }

    // Atualizar status para dismissed
    await reminderRepository.update(id, {
      status: 'dismissed'
    });

    const updatedReminder = await reminderRepository.findOne({ where: { id } });

    logger.info('Reminder marked as dismissed', {
      reminderId: id,
      userId
    });

    res.json({
      success: true,
      message: 'Lembrete descartado',
      data: updatedReminder
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
    const reminders = await reminderRepository.query(`
      SELECT r.*, v.brand, v.model, v.plate, v.current_km,
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
         CASE WHEN r.remind_at_km IS NOT NULL THEN r.remind_at_km ELSE 999999999 END ASC
    `, [userId]);

    logger.info('Pending reminders retrieved', {
      userId,
      count: reminders.length
    });

    res.json({
      success: true,
      data: reminders,
      count: reminders.length
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

    const reminders = await reminderRepository
      .createQueryBuilder('r')
      .innerJoin('r.vehicle', 'v')
      .addSelect(['v.brand', 'v.model', 'v.plate', 'v.current_km'])
      .where('r.vehicle_id = :vehicleId', { vehicleId })
      .orderBy('r.created_at', 'DESC')
      .getMany();

    logger.info('Reminders retrieved by vehicle', {
      vehicleId,
      userId,
      count: reminders.length
    });

    res.json({
      success: true,
      data: reminders,
      count: reminders.length
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
