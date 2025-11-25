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

// Rotas para veículos (todas requerem autenticação)

// GET /api/vehicles - Listar veículos ativos do usuário autenticado
router.get('/', authenticateToken, getUserVehicles);

// GET /api/vehicles/inactive - Listar veículos inativos do usuário autenticado
router.get('/inactive', authenticateToken, getInactiveVehicles);

// GET /api/vehicles/:id - Buscar veículo específico do usuário autenticado
router.get('/:id', authenticateToken, validateVehicleId, getVehicleById);

// POST /api/vehicles - Criar novo veículo para o usuário autenticado
router.post('/', authenticateToken, validateCreateVehicle, createVehicle);

// PUT /api/vehicles/:id - Atualizar veículo do usuário autenticado
router.put('/:id', authenticateToken, validateVehicleId, validateUpdateVehicle, updateVehicle);

// PATCH /api/vehicles/:id/inactivate - Inativar veículo (soft delete)
router.patch('/:id/inactivate', authenticateToken, validateVehicleId, inactivateVehicle);

// PATCH /api/vehicles/:id/reactivate - Reativar veículo
router.patch('/:id/reactivate', authenticateToken, validateVehicleId, reactivateVehicle);

// DELETE /api/vehicles/:id - Excluir veículo permanentemente (hard delete)
router.delete('/:id', authenticateToken, validateVehicleId, deleteVehicle);

// GET /api/vehicles/user/:userId - Listar veículos de usuário específico (apenas admin)
router.get('/user/:userId', authenticateToken, authorizeRoles('admin'), validateUserIdParam, getUserVehiclesByUserId);

module.exports = router;