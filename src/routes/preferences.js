const express = require('express');
const router = express.Router();
const {
  getUserPreferences,
  updateUserPreferences,
  resetUserPreferences,
  updateTheme
} = require('../controllers/preferencesController');
const { authenticateToken } = require('../middleware/auth');
const {
  validatePreferences,
  validateTheme,
  validateUserIdOptional
} = require('../middleware/validation');

/**
 * @swagger
 * components:
 *   schemas:
 *     UserPreferences:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: ID das preferências
 *         user_id:
 *           type: integer
 *           description: ID do usuário
 *         theme_mode:
 *           type: string
 *           enum: [light, dark, system]
 *           description: Modo do tema (claro, escuro ou sistema)
 *         theme_color:
 *           type: string
 *           description: Cor principal do tema
 *         font_size:
 *           type: string
 *           enum: [small, medium, large, extra-large]
 *           description: Tamanho da fonte
 *         compact_mode:
 *           type: boolean
 *           description: Modo compacto da interface
 *         animations_enabled:
 *           type: boolean
 *           description: Animações habilitadas
 *         high_contrast:
 *           type: boolean
 *           description: Modo de alto contraste
 *         reduce_motion:
 *           type: boolean
 *           description: Reduzir animações (acessibilidade)
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     PreferencesUpdate:
 *       type: object
 *       properties:
 *         theme_mode:
 *           type: string
 *           enum: [light, dark, system]
 *           description: Modo do tema
 *         theme_color:
 *           type: string
 *           description: Cor principal do tema
 *           example: blue
 *         font_size:
 *           type: string
 *           enum: [small, medium, large, extra-large]
 *           description: Tamanho da fonte
 *         compact_mode:
 *           type: boolean
 *           description: Modo compacto
 *         animations_enabled:
 *           type: boolean
 *           description: Habilitar animações
 *         high_contrast:
 *           type: boolean
 *           description: Alto contraste
 *         reduce_motion:
 *           type: boolean
 *           description: Reduzir movimento
 *     ThemeUpdate:
 *       type: object
 *       properties:
 *         theme_mode:
 *           type: string
 *           enum: [light, dark, system]
 *           description: Modo do tema
 *         theme_color:
 *           type: string
 *           description: Cor principal do tema
 *           example: blue
 */

/**
 * @swagger
 * /api/preferences:
 *   get:
 *     summary: Obter preferências do usuário autenticado
 *     tags: [Preferências]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Preferências obtidas com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserPreferences'
 *       401:
 *         description: Não autenticado
 *       500:
 *         description: Erro no servidor
 */
router.get('/', authenticateToken, getUserPreferences);

/**
 * @swagger
 * /api/preferences/{userId}:
 *   get:
 *     summary: Obter preferências de outro usuário
 *     tags: [Preferências]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID do usuário
 *         example: 1
 *     responses:
 *       200:
 *         description: Preferências obtidas com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserPreferences'
 *       400:
 *         description: ID inválido
 *       401:
 *         description: Não autenticado
 *       500:
 *         description: Erro no servidor
 */
router.get('/:userId', authenticateToken, validateUserIdOptional, getUserPreferences);

/**
 * @swagger
 * /api/preferences:
 *   put:
 *     summary: Criar ou atualizar preferências do usuário autenticado
 *     tags: [Preferências]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PreferencesUpdate'
 *           examples:
 *             darkTheme:
 *               summary: Tema escuro
 *               value:
 *                 theme_mode: dark
 *                 theme_color: purple
 *             fullUpdate:
 *               summary: Atualização completa
 *               value:
 *                 theme_mode: dark
 *                 theme_color: blue
 *                 font_size: large
 *                 compact_mode: true
 *                 animations_enabled: true
 *                 high_contrast: false
 *                 reduce_motion: false
 *     responses:
 *       200:
 *         description: Preferências atualizadas com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 preferences:
 *                   $ref: '#/components/schemas/UserPreferences'
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autenticado
 *       500:
 *         description: Erro no servidor
 */
router.put('/', authenticateToken, validatePreferences, updateUserPreferences);

/**
 * @swagger
 * /api/preferences/{userId}:
 *   put:
 *     summary: Criar ou atualizar preferências de outro usuário
 *     tags: [Preferências]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID do usuário
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PreferencesUpdate'
 *           examples:
 *             darkTheme:
 *               summary: Tema escuro
 *               value:
 *                 theme_mode: dark
 *                 theme_color: purple
 *             fullUpdate:
 *               summary: Atualização completa
 *               value:
 *                 theme_mode: dark
 *                 theme_color: blue
 *                 font_size: large
 *                 compact_mode: true
 *                 animations_enabled: true
 *                 high_contrast: false
 *                 reduce_motion: false
 *     responses:
 *       200:
 *         description: Preferências atualizadas com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 preferences:
 *                   $ref: '#/components/schemas/UserPreferences'
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autenticado
 *       500:
 *         description: Erro no servidor
 */
router.put('/:userId', authenticateToken, validateUserIdOptional, validatePreferences, updateUserPreferences);

/**
 * @swagger
 * /api/preferences:
 *   delete:
 *     summary: Resetar preferências do usuário autenticado para valores padrão
 *     tags: [Preferências]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Preferências resetadas com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: Nenhuma preferência encontrada
 *       401:
 *         description: Não autenticado
 *       500:
 *         description: Erro no servidor
 */
router.delete('/', authenticateToken, resetUserPreferences);

/**
 * @swagger
 * /api/preferences/{userId}:
 *   delete:
 *     summary: Resetar preferências de outro usuário para valores padrão
 *     tags: [Preferências]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID do usuário
 *         example: 1
 *     responses:
 *       200:
 *         description: Preferências resetadas com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: Nenhuma preferência encontrada
 *       401:
 *         description: Não autenticado
 *       500:
 *         description: Erro no servidor
 */
router.delete('/:userId', authenticateToken, validateUserIdOptional, resetUserPreferences);

/**
 * @swagger
 * /api/preferences/theme:
 *   patch:
 *     summary: Atualizar apenas configurações de tema
 *     tags: [Preferências]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ThemeUpdate'
 *           examples:
 *             darkMode:
 *               summary: Ativar modo escuro
 *               value:
 *                 theme_mode: dark
 *             systemMode:
 *               summary: Seguir sistema
 *               value:
 *                 theme_mode: system
 *             changeColor:
 *               summary: Mudar cor do tema
 *               value:
 *                 theme_color: purple
 *             both:
 *               summary: Modo e cor
 *               value:
 *                 theme_mode: dark
 *                 theme_color: blue
 *     responses:
 *       200:
 *         description: Tema atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 preferences:
 *                   $ref: '#/components/schemas/UserPreferences'
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autenticado
 *       500:
 *         description: Erro no servidor
 */
router.patch('/theme', authenticateToken, validateTheme, updateTheme);

module.exports = router;
