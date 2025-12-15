const express = require('express');
const {
  getMaintenanceTypes,
  getMaintenanceTypeById,
  createMaintenanceType,
  updateMaintenanceType,
  deleteMaintenanceType
} = require('../controllers/maintenanceTypeController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const {
  validateCreateMaintenanceType,
  validateUpdateMaintenanceType,
  validateMaintenanceTypeId
} = require('../middleware/validation');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     MaintenanceType:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         display_name:
 *           type: string
 *         typical_interval_km:
 *           type: integer
 *         typical_interval_months:
 *           type: integer
 *         icon:
 *           type: string
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     MaintenanceTypeCreate:
 *       type: object
 *       required:
 *         - name
 *         - display_name
 *       properties:
 *         name:
 *           type: string
 *           example: oil_change
 *         display_name:
 *           type: string
 *           example: Troca de Óleo
 *         typical_interval_km:
 *           type: integer
 *           example: 10000
 *         typical_interval_months:
 *           type: integer
 *           example: 6
 *         icon:
 *           type: string
 *           example: oil-can
 */

/**
 * @swagger
 * /api/maintenance-types:
 *   get:
 *     summary: Listar todos os tipos de manutenção
 *     tags: [Tipos de Manutenção]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: has_km_interval
 *         schema:
 *           type: boolean
 *         description: Filtrar por tipos com intervalo de quilometragem
 *       - in: query
 *         name: has_month_interval
 *         schema:
 *           type: boolean
 *         description: Filtrar por tipos com intervalo de meses
 *     responses:
 *       200:
 *         description: Lista de tipos de manutenção
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
 *                     $ref: '#/components/schemas/MaintenanceType'
 *       401:
 *         description: Não autenticado
 */
router.get('/', authenticateToken, getMaintenanceTypes);

/**
 * @swagger
 * /api/maintenance-types/{id}:
 *   get:
 *     summary: Buscar tipo de manutenção específico
 *     tags: [Tipos de Manutenção]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do tipo de manutenção
 *     responses:
 *       200:
 *         description: Tipo de manutenção encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/MaintenanceType'
 *       404:
 *         description: Tipo não encontrado
 *       401:
 *         description: Não autenticado
 */
router.get('/:id', authenticateToken, validateMaintenanceTypeId, getMaintenanceTypeById);

/**
 * @swagger
 * /api/maintenance-types:
 *   post:
 *     summary: Criar novo tipo de manutenção (admin only)
 *     tags: [Tipos de Manutenção]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MaintenanceTypeCreate'
 *     responses:
 *       201:
 *         description: Tipo criado com sucesso
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
 *                   $ref: '#/components/schemas/MaintenanceType'
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Acesso negado (requer permissão admin)
 */
router.post('/', authenticateToken, authorizeRoles('admin'), validateCreateMaintenanceType, createMaintenanceType);

/**
 * @swagger
 * /api/maintenance-types/{id}:
 *   put:
 *     summary: Atualizar tipo de manutenção (admin only)
 *     tags: [Tipos de Manutenção]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do tipo de manutenção
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MaintenanceTypeCreate'
 *     responses:
 *       200:
 *         description: Tipo atualizado com sucesso
 *       404:
 *         description: Tipo não encontrado
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Acesso negado (requer permissão admin)
 */
router.put('/:id', authenticateToken, authorizeRoles('admin'), validateMaintenanceTypeId, validateUpdateMaintenanceType, updateMaintenanceType);

/**
 * @swagger
 * /api/maintenance-types/{id}:
 *   delete:
 *     summary: Excluir tipo de manutenção (admin only)
 *     tags: [Tipos de Manutenção]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do tipo de manutenção
 *     responses:
 *       200:
 *         description: Tipo excluído com sucesso
 *       404:
 *         description: Tipo não encontrado
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Acesso negado (requer permissão admin)
 */
router.delete('/:id', authenticateToken, authorizeRoles('admin'), validateMaintenanceTypeId, deleteMaintenanceType);

module.exports = router;
