const express = require('express');
const router = express.Router();
const {
  requestPasswordReset,
  validateResetToken,
  resetPassword
} = require('../controllers/passwordResetController');

// Solicitar reset de senha
router.post('/request', requestPasswordReset);

// Validar token de reset
router.post('/validate-token', validateResetToken);

// Redefinir senha
router.post('/reset', resetPassword);

module.exports = router;
