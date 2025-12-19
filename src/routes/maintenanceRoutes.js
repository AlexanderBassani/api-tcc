const express = require('express');
const {
    getUserMaintenances,
    getMaintenanceById,
    createMaintenance,
    updateMaintenance,
    deleteMaintenance,
    completeMaintenance,
    getVehicleMaintenances,
    getMaintenanceStats
} = require('../controllers/maintenanceController');
const { authenticateToken } = require('../middleware/auth');
const {
    validateCreateMaintenance,
    validateUpdateMaintenance,
    validateMaintenanceId,
    validateVehicleIdParam
} = require('../middleware/validation');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Maintenance:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         vehicle_id:
 *           type: integer
 *         maintenance_type_id:
 *           type: integer
 *         service_provider_id:
 *           type: integer
 *         description:
 *           type: string
 *         cost:
 *           type: number
 *         service_date:
 *           type: string
 *           format: date
 *         km_at_service:
 *           type: integer
 *         next_service_km:
 *           type: integer
 *         next_service_date:
 *           type: string
 *           format: date
 *         is_completed:
 *           type: boolean
 *         notes:
 *           type: string
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     MaintenanceCreate:
 *       type: object
 *       required:
 *         - vehicle_id
 *         - description
 *         - cost
 *         - service_date
 *         - km_at_service
 *       properties:
 *         vehicle_id:
 *           type: integer
 *           example: 1
 *         maintenance_type_id:
 *           type: integer
 *           example: 1
 *         service_provider_id:
 *           type: integer
 *           example: 1
 *         description:
 *           type: string
 *           example: Troca de óleo e filtros
 *         cost:
 *           type: number
 *           example: 250.50
 *         service_date:
 *           type: string
 *           format: date
 *           example: 2024-01-15
 *         km_at_service:
 *           type: integer
 *           example: 50000
 *         next_service_km:
 *           type: integer
 *           example: 60000
 *         next_service_date:
 *           type: string
 *           format: date
 *           example: 2024-07-15
 *         is_completed:
 *           type: boolean
 *           example: true
 *         notes:
 *           type: string
 *           example: Serviço realizado conforme programado
 */

/**
 * @swagger
 * /api/maintenances:
 *   get:
 *     summary: Listar todas as manutenções dos veículos do usuário
 *     tags: [Manutenções]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de manutenções
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
 *                     $ref: '#/components/schemas/Maintenance'
 *       401:
 *         description: Não autenticado
 */
router.get('/', authenticateToken, getUserMaintenances);

/**
 * @swagger
 * /api/maintenances/stats:
 *   get:
 *     summary: Obter estatísticas de manutenções do usuário
 *     tags: [Manutenções]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estatísticas de manutenções
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       401:
 *         description: Não autenticado
 */
router.get('/stats', authenticateToken, getMaintenanceStats);

/**
 * @swagger
 * /api/maintenances/vehicle/{vehicleId}:
 *   get:
 *     summary: Listar manutenções de um veículo específico
 *     tags: [Manutenções]
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
 *         description: Lista de manutenções do veículo
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
 *                     $ref: '#/components/schemas/Maintenance'
 *       404:
 *         description: Veículo não encontrado
 *       401:
 *         description: Não autenticado
 */
router.get('/vehicle/:vehicleId', authenticateToken, validateVehicleIdParam, getVehicleMaintenances);

/**
 * @swagger
 * /api/maintenances/{id}:
 *   get:
 *     summary: Buscar manutenção específica
 *     tags: [Manutenções]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da manutenção
 *     responses:
 *       200:
 *         description: Manutenção encontrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Maintenance'
 *       404:
 *         description: Manutenção não encontrada
 *       401:
 *         description: Não autenticado
 */
router.get('/:id', authenticateToken, validateMaintenanceId, getMaintenanceById);

/**
 * @swagger
 * /api/maintenances:
 *   post:
 *     summary: Criar nova manutenção
 *     tags: [Manutenções]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MaintenanceCreate'
 *     responses:
 *       201:
 *         description: Manutenção criada com sucesso
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
 *                   $ref: '#/components/schemas/Maintenance'
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autenticado
 */
router.post('/', authenticateToken, validateCreateMaintenance, createMaintenance);

/**
 * @swagger
 * /api/maintenances/{id}:
 *   put:
 *     summary: Atualizar manutenção
 *     tags: [Manutenções]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da manutenção
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MaintenanceCreate'
 *     responses:
 *       200:
 *         description: Manutenção atualizada com sucesso
 *       404:
 *         description: Manutenção não encontrada
 *       401:
 *         description: Não autenticado
 */
router.put('/:id', authenticateToken, validateMaintenanceId, validateUpdateMaintenance, updateMaintenance);

/**
 * @swagger
 * /api/maintenances/{id}/complete:
 *   patch:
 *     summary: Marcar manutenção como concluída
 *     tags: [Manutenções]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da manutenção
 *     responses:
 *       200:
 *         description: Manutenção marcada como concluída
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
 *                   $ref: '#/components/schemas/Maintenance'
 *       400:
 *         description: Manutenção já está concluída
 *       404:
 *         description: Manutenção não encontrada
 *       401:
 *         description: Não autenticado
 */
router.patch('/:id/complete', authenticateToken, validateMaintenanceId, completeMaintenance);

/**
 * @swagger
 * /api/maintenances/{id}:
 *   delete:
 *     summary: Excluir manutenção
 *     tags: [Manutenções]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da manutenção
 *     responses:
 *       200:
 *         description: Manutenção excluída com sucesso
 *       404:
 *         description: Manutenção não encontrada
 *       401:
 *         description: Não autenticado
 */
router.delete('/:id', authenticateToken, validateMaintenanceId, deleteMaintenance);

module.exports = router;

