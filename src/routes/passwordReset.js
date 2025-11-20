const express = require('express');
const router = express.Router();
const {
  requestPasswordReset,
  validateResetToken,
  resetPassword
} = require('../controllers/passwordResetController');
const { passwordResetLimiter } = require('../middleware/rateLimiting');
const {
  validatePasswordResetRequest,
  validatePasswordResetToken,
  validatePasswordReset
} = require('../middleware/validation');

/**
 * @swagger
 * /api/password-reset/request:
 *   post:
 *     summary: Request password reset
 *     tags: [Password Reset]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PasswordResetRequest'
 *     responses:
 *       200:
 *         description: Reset email sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Bad request
 *       404:
 *         description: User not found
 *       429:
 *         description: Too many password reset requests
 */
router.post('/request', passwordResetLimiter, validatePasswordResetRequest, requestPasswordReset);

/**
 * @swagger
 * /api/password-reset/validate-token:
 *   post:
 *     summary: Validate password reset token
 *     tags: [Password Reset]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ValidateResetToken'
 *     responses:
 *       200:
 *         description: Token is valid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *       400:
 *         description: Invalid or expired token
 *       429:
 *         description: Too many validation attempts
 */
router.post('/validate-token', passwordResetLimiter, validatePasswordResetToken, validateResetToken);

/**
 * @swagger
 * /api/password-reset/reset:
 *   post:
 *     summary: Reset password with token
 *     tags: [Password Reset]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResetPassword'
 *     responses:
 *       200:
 *         description: Password reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid or expired token
 *       429:
 *         description: Too many reset attempts
 */
router.post('/reset', passwordResetLimiter, validatePasswordReset, resetPassword);

module.exports = router;
