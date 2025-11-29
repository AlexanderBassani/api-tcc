const express = require('express');
const {
  createServiceProvider,
  getServiceProviders,
  getServiceProviderById,
  updateServiceProvider,
  deleteServiceProvider,
  getFavoriteProviders,
  getProvidersByType
} = require('../controllers/serviceProviderController');
const { authenticateToken } = require('../middleware/auth');
const {
  validateCreateServiceProvider,
  validateUpdateServiceProvider,
  validateServiceProviderId,
  validateProviderType
} = require('../middleware/validation');

const router = express.Router();

// Rotas de prestadores de serviço (todas requerem autenticação)

// GET /api/service-providers - Listar prestadores (com filtros: type, is_favorite, min_rating)
router.get('/', authenticateToken, getServiceProviders);

// GET /api/service-providers/favorites - Listar favoritos
router.get('/favorites', authenticateToken, getFavoriteProviders);

// GET /api/service-providers/type/:type - Listar por tipo
router.get('/type/:type', authenticateToken, validateProviderType, getProvidersByType);

// GET /api/service-providers/:id - Buscar prestador específico
router.get('/:id', authenticateToken, validateServiceProviderId, getServiceProviderById);

// POST /api/service-providers - Criar novo prestador
router.post('/', authenticateToken, validateCreateServiceProvider, createServiceProvider);

// PUT /api/service-providers/:id - Atualizar prestador
router.put('/:id', authenticateToken, validateServiceProviderId, validateUpdateServiceProvider, updateServiceProvider);

// DELETE /api/service-providers/:id - Excluir prestador
router.delete('/:id', authenticateToken, validateServiceProviderId, deleteServiceProvider);

module.exports = router;
