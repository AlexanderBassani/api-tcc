const express = require('express');
const {
    getUserVehicles,
    getVehicleById,
    createVehicle,
    updateVehicle,
    inactivateVehicle,
    reactivateVehicle,
    deleteVehicle,
    getInactiveVehicles,
    getUserVehiclesByUserId
} = require('../controllers/vehicleController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const {
    validateCreateVehicle,
    validateUpdateVehicle,
    validateVehicleId,
    validateUserIdParam
} = require('../middleware/validation');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Vehicle:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: ID do veículo
 *         user_id:
 *           type: integer
 *           description: ID do usuário proprietário
 *         brand:
 *           type: string
 *           description: Marca do veículo
 *         model:
 *           type: string
 *           description: Modelo do veículo
 *         year:
 *           type: integer
 *           description: Ano do veículo
 *         plate:
 *           type: string
 *           description: Placa do veículo
 *         color:
 *           type: string
 *           description: Cor do veículo
 *         current_km:
 *           type: integer
 *           description: Quilometragem atual
 *         purchase_date:
 *           type: string
 *           format: date
 *           description: Data de aquisição
 *         notes:
 *           type: string
 *           description: Observações
 *         is_active:
 *           type: boolean
 *           description: Status ativo/inativo
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     VehicleCreate:
 *       type: object
 *       required:
 *         - brand
 *         - model
 *         - year
 *         - plate
 *       properties:
 *         brand:
 *           type: string
 *           example: Toyota
 *         model:
 *           type: string
 *           example: Corolla
 *         year:
 *           type: integer
 *           example: 2020
 *         plate:
 *           type: string
 *           example: ABC1D23
 *         color:
 *           type: string
 *           example: Prata
 *         current_km:
 *           type: integer
 *           example: 50000
 *         purchase_date:
 *           type: string
 *           format: date
 *           example: 2020-01-15
 *         notes:
 *           type: string
 *           example: Veículo em ótimo estado
 */

/**
 * @swagger
 * /api/vehicles:
 *   get:
 *     summary: Listar veículos ativos do usuário autenticado
 *     tags: [Veículos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de veículos ativos
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
 *                     $ref: '#/components/schemas/Vehicle'
 *       401:
 *         description: Não autenticado
 */
router.get('/', authenticateToken, getUserVehicles);

/**
 * @swagger
 * /api/vehicles/inactive:
 *   get:
 *     summary: Listar veículos inativos do usuário autenticado
 *     tags: [Veículos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de veículos inativos
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
 *                     $ref: '#/components/schemas/Vehicle'
 *       401:
 *         description: Não autenticado
 */
router.get('/inactive', authenticateToken, getInactiveVehicles);

/**
 * @swagger
 * /api/vehicles/{id}:
 *   get:
 *     summary: Buscar veículo específico
 *     tags: [Veículos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do veículo
 *     responses:
 *       200:
 *         description: Veículo encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Vehicle'
 *       404:
 *         description: Veículo não encontrado
 *       401:
 *         description: Não autenticado
 */
router.get('/:id', authenticateToken, validateVehicleId, getVehicleById);

/**
 * @swagger
 * /api/vehicles:
 *   post:
 *     summary: Criar novo veículo
 *     tags: [Veículos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VehicleCreate'
 *     responses:
 *       201:
 *         description: Veículo criado com sucesso
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
 *                   $ref: '#/components/schemas/Vehicle'
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autenticado
 */
router.post('/', authenticateToken, validateCreateVehicle, createVehicle);

/**
 * @swagger
 * /api/vehicles/{id}:
 *   put:
 *     summary: Atualizar veículo
 *     tags: [Veículos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do veículo
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VehicleCreate'
 *     responses:
 *       200:
 *         description: Veículo atualizado com sucesso
 *       404:
 *         description: Veículo não encontrado
 *       401:
 *         description: Não autenticado
 */
router.put('/:id', authenticateToken, validateVehicleId, validateUpdateVehicle, updateVehicle);

/**
 * @swagger
 * /api/vehicles/{id}/inactivate:
 *   patch:
 *     summary: Inativar veículo (soft delete)
 *     tags: [Veículos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do veículo
 *     responses:
 *       200:
 *         description: Veículo inativado com sucesso
 *       404:
 *         description: Veículo não encontrado
 *       401:
 *         description: Não autenticado
 */
router.patch('/:id/inactivate', authenticateToken, validateVehicleId, inactivateVehicle);

/**
 * @swagger
 * /api/vehicles/{id}/reactivate:
 *   patch:
 *     summary: Reativar veículo
 *     tags: [Veículos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do veículo
 *     responses:
 *       200:
 *         description: Veículo reativado com sucesso
 *       404:
 *         description: Veículo não encontrado
 *       401:
 *         description: Não autenticado
 */
router.patch('/:id/reactivate', authenticateToken, validateVehicleId, reactivateVehicle);

/**
 * @swagger
 * /api/vehicles/{id}:
 *   delete:
 *     summary: Excluir veículo permanentemente (hard delete)
 *     tags: [Veículos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do veículo
 *     responses:
 *       200:
 *         description: Veículo excluído com sucesso
 *       404:
 *         description: Veículo não encontrado
 *       401:
 *         description: Não autenticado
 */
router.delete('/:id', authenticateToken, validateVehicleId, deleteVehicle);

/**
 * @swagger
 * /api/vehicles/user/{userId}:
 *   get:
 *     summary: Listar veículos de usuário específico (admin only)
 *     tags: [Veículos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do usuário
 *     responses:
 *       200:
 *         description: Lista de veículos do usuário
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
 *                     $ref: '#/components/schemas/Vehicle'
 *       403:
 *         description: Acesso negado (requer permissão admin)
 *       401:
 *         description: Não autenticado
 */
router.get('/user/:userId', authenticateToken, authorizeRoles('admin'), validateUserIdParam, getUserVehiclesByUserId);

module.exports = router;
