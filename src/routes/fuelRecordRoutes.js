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

// Rotas de registros de abastecimento (todas requerem autenticação)

// GET /api/fuel-records - Listar registros (com filtros: vehicle_id, fuel_type, start_date, end_date)
router.get('/', authenticateToken, getFuelRecords);

// GET /api/fuel-records/vehicle/:vehicleId - Listar registros de um veículo
router.get('/vehicle/:vehicleId', authenticateToken, validateVehicleIdParam, getFuelRecordsByVehicle);

// GET /api/fuel-records/vehicle/:vehicleId/statistics - Estatísticas de consumo
router.get('/vehicle/:vehicleId/statistics', authenticateToken, validateVehicleIdParam, getFuelStatistics);

// GET /api/fuel-records/:id - Buscar registro específico
router.get('/:id', authenticateToken, validateFuelRecordId, getFuelRecordById);

// POST /api/fuel-records - Criar novo registro
router.post('/', authenticateToken, validateCreateFuelRecord, createFuelRecord);

// PUT /api/fuel-records/:id - Atualizar registro
router.put('/:id', authenticateToken, validateFuelRecordId, validateUpdateFuelRecord, updateFuelRecord);

// DELETE /api/fuel-records/:id - Excluir registro
router.delete('/:id', authenticateToken, validateFuelRecordId, deleteFuelRecord);

module.exports = router;
