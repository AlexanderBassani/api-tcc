const express = require('express');
const {
    getUserMaintenances,
    getMaintenanceById,
    createMaintenance,
    updateMaintenance,
    deleteMaintenance,
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

// Rotas para manutenções (todas requerem autenticação)

// GET /api/maintenances - Listar todas as manutenções dos veículos do usuário
router.get('/', authenticateToken, getUserMaintenances);

// GET /api/maintenances/stats - Obter estatísticas de manutenções (deve vir ANTES da rota /:id)
router.get('/stats', authenticateToken, getMaintenanceStats);

// GET /api/maintenances/vehicle/:vehicleId - Listar manutenções de um veículo específico (deve vir ANTES da rota /:id)
router.get('/vehicle/:vehicleId', authenticateToken, validateVehicleIdParam, getVehicleMaintenances);

// GET /api/maintenances/:id - Buscar manutenção específica
router.get('/:id', authenticateToken, validateMaintenanceId, getMaintenanceById);

// POST /api/maintenances - Criar nova manutenção
router.post('/', authenticateToken, validateCreateMaintenance, createMaintenance);

// PUT /api/maintenances/:id - Atualizar manutenção
router.put('/:id', authenticateToken, validateMaintenanceId, validateUpdateMaintenance, updateMaintenance);

// DELETE /api/maintenances/:id - Excluir manutenção
router.delete('/:id', authenticateToken, validateMaintenanceId, deleteMaintenance);

module.exports = router;