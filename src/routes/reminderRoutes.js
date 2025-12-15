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

/**
 * @swagger
 * components:
 *   schemas:
 *     Reminder:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: ID do lembrete
 *         vehicle_id:
 *           type: integer
 *           description: ID do veículo
 *         type:
 *           type: string
 *           enum: [maintenance, inspection, insurance, licensing, tax, other]
 *           description: Tipo do lembrete
 *         title:
 *           type: string
 *           description: Título do lembrete
 *         description:
 *           type: string
 *           description: Descrição detalhada
 *         remind_at_km:
 *           type: integer
 *           description: Lembrar ao atingir esta quilometragem
 *         remind_at_date:
 *           type: string
 *           format: date
 *           description: Lembrar nesta data
 *         status:
 *           type: string
 *           enum: [pending, completed, dismissed]
 *           description: Status do lembrete
 *         is_recurring:
 *           type: boolean
 *           description: Lembrete recorrente
 *         recurrence_km:
 *           type: integer
 *           description: Recorrência em quilômetros
 *         recurrence_months:
 *           type: integer
 *           description: Recorrência em meses
 *         completed_at:
 *           type: string
 *           format: date-time
 *           description: Data de conclusão
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     ReminderCreate:
 *       type: object
 *       required:
 *         - vehicle_id
 *         - type
 *         - title
 *       properties:
 *         vehicle_id:
 *           type: integer
 *           example: 1
 *         type:
 *           type: string
 *           enum: [maintenance, inspection, insurance, licensing, tax, other]
 *           example: maintenance
 *         title:
 *           type: string
 *           example: Troca de óleo
 *         description:
 *           type: string
 *           example: Realizar troca de óleo e filtros
 *         remind_at_km:
 *           type: integer
 *           example: 60000
 *         remind_at_date:
 *           type: string
 *           format: date
 *           example: 2025-02-15
 *         is_recurring:
 *           type: boolean
 *           example: true
 *         recurrence_km:
 *           type: integer
 *           example: 10000
 *         recurrence_months:
 *           type: integer
 *           example: 6
 *     PendingReminder:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         vehicle_id:
 *           type: integer
 *         type:
 *           type: string
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         remind_at_km:
 *           type: integer
 *         remind_at_date:
 *           type: string
 *           format: date
 *         status:
 *           type: string
 *         days_until_due:
 *           type: integer
 *           description: Dias até vencimento (negativo se atrasado)
 *         km_until_due:
 *           type: integer
 *           description: Quilômetros até vencimento (negativo se atrasado)
 *         is_overdue:
 *           type: boolean
 *           description: Indica se o lembrete está atrasado
 *         vehicle_brand:
 *           type: string
 *         vehicle_model:
 *           type: string
 *         current_km:
 *           type: integer
 */

/**
 * @swagger
 * /api/reminders:
 *   get:
 *     summary: Listar lembretes do usuário
 *     description: Lista todos os lembretes com filtros opcionais
 *     tags: [Lembretes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, completed, dismissed]
 *         description: Filtrar por status
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [maintenance, inspection, insurance, licensing, tax, other]
 *         description: Filtrar por tipo
 *       - in: query
 *         name: vehicle_id
 *         schema:
 *           type: integer
 *         description: Filtrar por ID do veículo
 *     responses:
 *       200:
 *         description: Lista de lembretes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Reminder'
 *       401:
 *         description: Não autenticado
 */
router.get('/', authenticateToken, getReminders);

/**
 * @swagger
 * /api/reminders/pending:
 *   get:
 *     summary: Listar lembretes pendentes próximos de vencer
 *     description: Retorna lembretes que vencem nos próximos 30 dias ou 500km
 *     tags: [Lembretes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de lembretes pendentes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PendingReminder'
 *       401:
 *         description: Não autenticado
 */
router.get('/pending', authenticateToken, getPendingReminders);

/**
 * @swagger
 * /api/reminders/vehicle/{vehicleId}:
 *   get:
 *     summary: Listar lembretes de um veículo específico
 *     tags: [Lembretes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do veículo
 *     responses:
 *       200:
 *         description: Lista de lembretes do veículo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Reminder'
 *       404:
 *         description: Veículo não encontrado
 *       401:
 *         description: Não autenticado
 */
router.get('/vehicle/:vehicleId', authenticateToken, validateVehicleIdParam, getRemindersByVehicle);

/**
 * @swagger
 * /api/reminders/{id}:
 *   get:
 *     summary: Buscar lembrete específico
 *     tags: [Lembretes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do lembrete
 *     responses:
 *       200:
 *         description: Lembrete encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Reminder'
 *       404:
 *         description: Lembrete não encontrado
 *       401:
 *         description: Não autenticado
 */
router.get('/:id', authenticateToken, validateReminderId, getReminderById);

/**
 * @swagger
 * /api/reminders:
 *   post:
 *     summary: Criar novo lembrete
 *     description: Cria um lembrete. Pelo menos um critério (data ou km) é obrigatório
 *     tags: [Lembretes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReminderCreate'
 *     responses:
 *       201:
 *         description: Lembrete criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Reminder'
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autenticado
 */
router.post('/', authenticateToken, validateCreateReminder, createReminder);

/**
 * @swagger
 * /api/reminders/{id}:
 *   put:
 *     summary: Atualizar lembrete
 *     tags: [Lembretes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do lembrete
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReminderCreate'
 *     responses:
 *       200:
 *         description: Lembrete atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Reminder'
 *       404:
 *         description: Lembrete não encontrado
 *       401:
 *         description: Não autenticado
 */
router.put('/:id', authenticateToken, validateReminderId, validateUpdateReminder, updateReminder);

/**
 * @swagger
 * /api/reminders/{id}/complete:
 *   patch:
 *     summary: Marcar lembrete como concluído
 *     description: Marca o lembrete como concluído e cria novo se for recorrente
 *     tags: [Lembretes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do lembrete
 *     responses:
 *       200:
 *         description: Lembrete marcado como concluído
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Reminder'
 *                 next_reminder:
 *                   $ref: '#/components/schemas/Reminder'
 *                   description: Próximo lembrete criado (se recorrente)
 *       404:
 *         description: Lembrete não encontrado
 *       401:
 *         description: Não autenticado
 */
router.patch('/:id/complete', authenticateToken, validateReminderId, markAsCompleted);

/**
 * @swagger
 * /api/reminders/{id}/dismiss:
 *   patch:
 *     summary: Marcar lembrete como descartado
 *     tags: [Lembretes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do lembrete
 *     responses:
 *       200:
 *         description: Lembrete descartado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Reminder'
 *       404:
 *         description: Lembrete não encontrado
 *       401:
 *         description: Não autenticado
 */
router.patch('/:id/dismiss', authenticateToken, validateReminderId, markAsDismissed);

/**
 * @swagger
 * /api/reminders/{id}:
 *   delete:
 *     summary: Excluir lembrete
 *     tags: [Lembretes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do lembrete
 *     responses:
 *       200:
 *         description: Lembrete excluído com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: Lembrete não encontrado
 *       401:
 *         description: Não autenticado
 */
router.delete('/:id', authenticateToken, validateReminderId, deleteReminder);

module.exports = router;
