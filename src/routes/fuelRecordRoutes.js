const express = require('express');
const {
  createFuelRecord,
  getFuelRecords,
  getFuelRecordById,
  updateFuelRecord,
  deleteFuelRecord,
  getFuelRecordsByVehicle,
  getFuelStatistics
} = require('../controllers/fuelRecordController');
const { authenticateToken } = require('../middleware/auth');
const {
  validateCreateFuelRecord,
  validateUpdateFuelRecord,
  validateFuelRecordId,
  validateVehicleIdParam
} = require('../middleware/validation');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     FuelRecord:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: ID do registro de abastecimento
 *         vehicle_id:
 *           type: integer
 *           description: ID do veículo
 *         date:
 *           type: string
 *           format: date
 *           description: Data do abastecimento
 *         km:
 *           type: integer
 *           description: Quilometragem no momento do abastecimento
 *         liters:
 *           type: number
 *           format: decimal
 *           description: Litros abastecidos
 *         price_per_liter:
 *           type: number
 *           format: decimal
 *           description: Preço por litro
 *         total_cost:
 *           type: number
 *           format: decimal
 *           description: Custo total (calculado automaticamente)
 *         fuel_type:
 *           type: string
 *           enum: [gasoline, ethanol, diesel, gnv, flex]
 *           description: Tipo de combustível
 *         is_full_tank:
 *           type: boolean
 *           description: Tanque cheio (usado para cálculo de consumo)
 *         gas_station:
 *           type: string
 *           description: Nome do posto
 *         notes:
 *           type: string
 *           description: Observações
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     FuelRecordCreate:
 *       type: object
 *       required:
 *         - vehicle_id
 *         - date
 *         - km
 *         - liters
 *         - price_per_liter
 *       properties:
 *         vehicle_id:
 *           type: integer
 *           example: 1
 *         date:
 *           type: string
 *           format: date
 *           example: 2025-01-10
 *         km:
 *           type: integer
 *           example: 52000
 *         liters:
 *           type: number
 *           format: decimal
 *           example: 45.5
 *         price_per_liter:
 *           type: number
 *           format: decimal
 *           example: 5.89
 *         fuel_type:
 *           type: string
 *           enum: [gasoline, ethanol, diesel, gnv, flex]
 *           example: gasoline
 *         is_full_tank:
 *           type: boolean
 *           example: true
 *         gas_station:
 *           type: string
 *           example: Posto Shell
 *         notes:
 *           type: string
 *           example: Abastecimento completo
 *     FuelStatistics:
 *       type: object
 *       properties:
 *         vehicle_id:
 *           type: integer
 *           description: ID do veículo
 *         total_records:
 *           type: integer
 *           description: Total de registros
 *         total_liters:
 *           type: number
 *           format: decimal
 *           description: Total de litros abastecidos
 *         total_cost:
 *           type: number
 *           format: decimal
 *           description: Custo total
 *         average_price_per_liter:
 *           type: number
 *           format: decimal
 *           description: Preço médio por litro
 *         average_consumption:
 *           type: number
 *           format: decimal
 *           description: Consumo médio (km/l)
 *         by_fuel_type:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               fuel_type:
 *                 type: string
 *               count:
 *                 type: integer
 *               total_liters:
 *                 type: number
 *               total_cost:
 *                 type: number
 *               avg_consumption:
 *                 type: number
 */

/**
 * @swagger
 * /api/fuel-records:
 *   get:
 *     summary: Listar registros de abastecimento
 *     description: Lista todos os registros do usuário autenticado com filtros opcionais
 *     tags: [Registros de Abastecimento]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: vehicle_id
 *         schema:
 *           type: integer
 *         description: Filtrar por ID do veículo
 *       - in: query
 *         name: fuel_type
 *         schema:
 *           type: string
 *           enum: [gasoline, ethanol, diesel, gnv, flex]
 *         description: Filtrar por tipo de combustível
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Data inicial
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Data final
 *     responses:
 *       200:
 *         description: Lista de registros de abastecimento
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
 *                     $ref: '#/components/schemas/FuelRecord'
 *       401:
 *         description: Não autenticado
 */
router.get('/', authenticateToken, getFuelRecords);

/**
 * @swagger
 * /api/fuel-records/vehicle/{vehicleId}:
 *   get:
 *     summary: Listar registros de um veículo específico
 *     tags: [Registros de Abastecimento]
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
 *         description: Lista de registros do veículo
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
 *                     $ref: '#/components/schemas/FuelRecord'
 *       404:
 *         description: Veículo não encontrado
 *       401:
 *         description: Não autenticado
 */
router.get('/vehicle/:vehicleId', authenticateToken, validateVehicleIdParam, getFuelRecordsByVehicle);

/**
 * @swagger
 * /api/fuel-records/vehicle/{vehicleId}/statistics:
 *   get:
 *     summary: Obter estatísticas de consumo do veículo
 *     description: Retorna estatísticas detalhadas de consumo, custo e tipo de combustível
 *     tags: [Registros de Abastecimento]
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
 *         description: Estatísticas de consumo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/FuelStatistics'
 *       404:
 *         description: Veículo não encontrado
 *       401:
 *         description: Não autenticado
 */
router.get('/vehicle/:vehicleId/statistics', authenticateToken, validateVehicleIdParam, getFuelStatistics);

/**
 * @swagger
 * /api/fuel-records/{id}:
 *   get:
 *     summary: Buscar registro específico
 *     tags: [Registros de Abastecimento]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do registro
 *     responses:
 *       200:
 *         description: Registro encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/FuelRecord'
 *       404:
 *         description: Registro não encontrado
 *       401:
 *         description: Não autenticado
 */
router.get('/:id', authenticateToken, validateFuelRecordId, getFuelRecordById);

/**
 * @swagger
 * /api/fuel-records:
 *   post:
 *     summary: Criar novo registro de abastecimento
 *     tags: [Registros de Abastecimento]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FuelRecordCreate'
 *     responses:
 *       201:
 *         description: Registro criado com sucesso
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
 *                   $ref: '#/components/schemas/FuelRecord'
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autenticado
 */
router.post('/', authenticateToken, validateCreateFuelRecord, createFuelRecord);

/**
 * @swagger
 * /api/fuel-records/{id}:
 *   put:
 *     summary: Atualizar registro de abastecimento
 *     tags: [Registros de Abastecimento]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do registro
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FuelRecordCreate'
 *     responses:
 *       200:
 *         description: Registro atualizado com sucesso
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
 *                   $ref: '#/components/schemas/FuelRecord'
 *       404:
 *         description: Registro não encontrado
 *       401:
 *         description: Não autenticado
 */
router.put('/:id', authenticateToken, validateFuelRecordId, validateUpdateFuelRecord, updateFuelRecord);

/**
 * @swagger
 * /api/fuel-records/{id}:
 *   delete:
 *     summary: Excluir registro de abastecimento
 *     tags: [Registros de Abastecimento]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do registro
 *     responses:
 *       200:
 *         description: Registro excluído com sucesso
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
 *         description: Registro não encontrado
 *       401:
 *         description: Não autenticado
 */
router.delete('/:id', authenticateToken, validateFuelRecordId, deleteFuelRecord);

module.exports = router;
