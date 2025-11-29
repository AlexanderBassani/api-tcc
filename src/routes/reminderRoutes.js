const express = require('express');
const {
  createReminder,
  getReminders,
  getReminderById,
  updateReminder,
  deleteReminder,
  markAsCompleted,
  markAsDismissed,
  getPendingReminders,
  getRemindersByVehicle
} = require('../controllers/reminderController');
const { authenticateToken } = require('../middleware/auth');
const {
  validateCreateReminder,
  validateUpdateReminder,
  validateReminderId,
  validateVehicleIdParam
} = require('../middleware/validation');

const router = express.Router();

// Rotas de lembretes (todas requerem autenticação)

// GET /api/reminders - Listar lembretes do usuário (com filtros opcionais: status, type, vehicle_id)
router.get('/', authenticateToken, getReminders);

// GET /api/reminders/pending - Listar lembretes pendentes (próximos de vencer)
router.get('/pending', authenticateToken, getPendingReminders);

// GET /api/reminders/vehicle/:vehicleId - Listar lembretes de um veículo específico
router.get('/vehicle/:vehicleId', authenticateToken, validateVehicleIdParam, getRemindersByVehicle);

// GET /api/reminders/:id - Buscar lembrete específico
router.get('/:id', authenticateToken, validateReminderId, getReminderById);

// POST /api/reminders - Criar novo lembrete
router.post('/', authenticateToken, validateCreateReminder, createReminder);

// PUT /api/reminders/:id - Atualizar lembrete
router.put('/:id', authenticateToken, validateReminderId, validateUpdateReminder, updateReminder);

// PATCH /api/reminders/:id/complete - Marcar lembrete como concluído
router.patch('/:id/complete', authenticateToken, validateReminderId, markAsCompleted);

// PATCH /api/reminders/:id/dismiss - Marcar lembrete como descartado
router.patch('/:id/dismiss', authenticateToken, validateReminderId, markAsDismissed);

// DELETE /api/reminders/:id - Excluir lembrete
router.delete('/:id', authenticateToken, validateReminderId, deleteReminder);

module.exports = router;
