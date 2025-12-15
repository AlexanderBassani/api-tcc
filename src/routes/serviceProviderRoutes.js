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

/**
 * @swagger
 * components:
 *   schemas:
 *     ServiceProvider:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         user_id:
 *           type: integer
 *         name:
 *           type: string
 *         type:
 *           type: string
 *           enum: [mechanic, bodyshop, dealer, specialist, other]
 *         phone:
 *           type: string
 *         email:
 *           type: string
 *         address:
 *           type: string
 *         rating:
 *           type: number
 *           minimum: 0
 *           maximum: 5
 *         notes:
 *           type: string
 *         is_favorite:
 *           type: boolean
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     ServiceProviderCreate:
 *       type: object
 *       required:
 *         - name
 *         - type
 *       properties:
 *         name:
 *           type: string
 *           example: Oficina do João
 *         type:
 *           type: string
 *           enum: [mechanic, bodyshop, dealer, specialist, other]
 *           example: mechanic
 *         phone:
 *           type: string
 *           example: (11) 98765-4321
 *         email:
 *           type: string
 *           example: contato@oficina.com
 *         address:
 *           type: string
 *           example: Rua das Flores, 123 - São Paulo
 *         rating:
 *           type: number
 *           minimum: 0
 *           maximum: 5
 *           example: 4.5
 *         notes:
 *           type: string
 *           example: Atendimento excelente, preços justos
 *         is_favorite:
 *           type: boolean
 *           example: true
 */

/**
 * @swagger
 * /api/service-providers:
 *   get:
 *     summary: Listar prestadores de serviço
 *     tags: [Prestadores de Serviço]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [mechanic, bodyshop, dealer, specialist, other]
 *         description: Filtrar por tipo de prestador
 *       - in: query
 *         name: is_favorite
 *         schema:
 *           type: boolean
 *         description: Filtrar apenas favoritos
 *       - in: query
 *         name: min_rating
 *         schema:
 *           type: number
 *         description: Avaliação mínima
 *     responses:
 *       200:
 *         description: Lista de prestadores
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
 *                     $ref: '#/components/schemas/ServiceProvider'
 *       401:
 *         description: Não autenticado
 */
router.get('/', authenticateToken, getServiceProviders);

/**
 * @swagger
 * /api/service-providers/favorites:
 *   get:
 *     summary: Listar prestadores favoritos
 *     tags: [Prestadores de Serviço]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de prestadores favoritos
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
 *                     $ref: '#/components/schemas/ServiceProvider'
 *       401:
 *         description: Não autenticado
 */
router.get('/favorites', authenticateToken, getFavoriteProviders);

/**
 * @swagger
 * /api/service-providers/type/{type}:
 *   get:
 *     summary: Listar prestadores por tipo
 *     tags: [Prestadores de Serviço]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [mechanic, bodyshop, dealer, specialist, other]
 *         description: Tipo de prestador
 *     responses:
 *       200:
 *         description: Lista de prestadores do tipo especificado
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
 *                     $ref: '#/components/schemas/ServiceProvider'
 *       400:
 *         description: Tipo inválido
 *       401:
 *         description: Não autenticado
 */
router.get('/type/:type', authenticateToken, validateProviderType, getProvidersByType);

/**
 * @swagger
 * /api/service-providers/{id}:
 *   get:
 *     summary: Buscar prestador específico
 *     tags: [Prestadores de Serviço]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do prestador
 *     responses:
 *       200:
 *         description: Prestador encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ServiceProvider'
 *       404:
 *         description: Prestador não encontrado
 *       401:
 *         description: Não autenticado
 */
router.get('/:id', authenticateToken, validateServiceProviderId, getServiceProviderById);

/**
 * @swagger
 * /api/service-providers:
 *   post:
 *     summary: Criar novo prestador de serviço
 *     tags: [Prestadores de Serviço]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ServiceProviderCreate'
 *     responses:
 *       201:
 *         description: Prestador criado com sucesso
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
 *                   $ref: '#/components/schemas/ServiceProvider'
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autenticado
 */
router.post('/', authenticateToken, validateCreateServiceProvider, createServiceProvider);

/**
 * @swagger
 * /api/service-providers/{id}:
 *   put:
 *     summary: Atualizar prestador de serviço
 *     tags: [Prestadores de Serviço]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do prestador
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ServiceProviderCreate'
 *     responses:
 *       200:
 *         description: Prestador atualizado com sucesso
 *       404:
 *         description: Prestador não encontrado
 *       401:
 *         description: Não autenticado
 */
router.put('/:id', authenticateToken, validateServiceProviderId, validateUpdateServiceProvider, updateServiceProvider);

/**
 * @swagger
 * /api/service-providers/{id}:
 *   delete:
 *     summary: Excluir prestador de serviço
 *     tags: [Prestadores de Serviço]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do prestador
 *     responses:
 *       200:
 *         description: Prestador excluído com sucesso
 *       404:
 *         description: Prestador não encontrado
 *       401:
 *         description: Não autenticado
 */
router.delete('/:id', authenticateToken, validateServiceProviderId, deleteServiceProvider);

module.exports = router;
