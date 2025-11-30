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

// Rotas de tipos de manutenção

// GET /api/maintenance-types - Listar todos os tipos (qualquer usuário autenticado)
router.get('/', authenticateToken, getMaintenanceTypes);

// GET /api/maintenance-types/:id - Buscar tipo específico (qualquer usuário autenticado)
router.get('/:id', authenticateToken, validateMaintenanceTypeId, getMaintenanceTypeById);

// POST /api/maintenance-types - Criar novo tipo (apenas admin)
router.post('/', authenticateToken, authorizeRoles('admin'), validateCreateMaintenanceType, createMaintenanceType);

// PUT /api/maintenance-types/:id - Atualizar tipo (apenas admin)
router.put('/:id', authenticateToken, authorizeRoles('admin'), validateMaintenanceTypeId, validateUpdateMaintenanceType, updateMaintenanceType);

// DELETE /api/maintenance-types/:id - Excluir tipo (apenas admin)
router.delete('/:id', authenticateToken, authorizeRoles('admin'), validateMaintenanceTypeId, deleteMaintenanceType);

module.exports = router;
