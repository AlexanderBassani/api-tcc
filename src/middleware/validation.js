const { body, param, validationResult } = require('express-validator');

/**
 * Middleware para processar erros de validação
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorArray = errors.array();
    const firstError = errorArray[0];

    // Se há múltiplos erros de campos obrigatórios, usa mensagem genérica
    const hasMultipleRequired = errorArray.filter(e =>
      e.msg.includes('obrigatório') || e.msg.includes('obrigatória')
    ).length > 1;

    // Determinar mensagem de erro principal
    let errorMsg = firstError.msg;
    let detailMsg = firstError.msg;

    // Para múltiplos campos obrigatórios
    if (hasMultipleRequired) {
      errorMsg = 'Campos obrigatórios não fornecidos';
      detailMsg = 'Campos obrigatórios não fornecidos';
    }
    // Para validações de preferências (theme_mode, font_size, etc)
    else if (req.originalUrl && req.originalUrl.includes('/preferences')) {
      errorMsg = 'Validação falhou';
      detailMsg = `${firstError.path}: ${firstError.msg}`;
    }
    // Para validações de ID em parâmetros de rota
    else if ((firstError.path === 'id' || firstError.path === 'userId') &&
             firstError.msg === 'ID de usuário inválido') {
      errorMsg = 'ID do usuário inválido';
      detailMsg = 'ID do usuário inválido';
    }

    return res.status(400).json({
      error: errorMsg,
      message: detailMsg,
      details: errorArray.map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value
      }))
    });
  }

  next();
};

/**
 * Validações para registro de usuário
 */
const validateRegister = [
  body('first_name')
    .trim()
    .notEmpty().withMessage('Primeiro nome é obrigatório')
    .isLength({ min: 2, max: 50 }).withMessage('Primeiro nome deve ter entre 2 e 50 caracteres')
    .matches(/^[a-zA-ZÀ-ÿ\s]+$/).withMessage('Primeiro nome deve conter apenas letras')
    .escape(),

  body('last_name')
    .trim()
    .notEmpty().withMessage('Sobrenome é obrigatório')
    .isLength({ min: 2, max: 50 }).withMessage('Sobrenome deve ter entre 2 e 50 caracteres')
    .matches(/^[a-zA-ZÀ-ÿ\s]+$/).withMessage('Sobrenome deve conter apenas letras')
    .escape(),

  body('username')
    .trim()
    .notEmpty().withMessage('Username é obrigatório')
    .isLength({ min: 3, max: 30 }).withMessage('Username deve ter entre 3 e 30 caracteres')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username deve conter apenas letras, números e underscore')
    .escape(),

  body('email')
    .trim()
    .notEmpty().withMessage('Email é obrigatório')
    .isEmail().withMessage('Email inválido')
    .normalizeEmail()
    .isLength({ max: 100 }).withMessage('Email deve ter no máximo 100 caracteres'),

  body('password')
    .notEmpty().withMessage('Senha é obrigatória')
    .isLength({ min: 6 }).withMessage('Senha deve ter no mínimo 6 caracteres'),

  body('role')
    .optional()
    .trim()
    .isIn(['admin', 'user']).withMessage('Role deve ser "admin" ou "user"')
    .escape(),

  handleValidationErrors
];

/**
 * Validações para login
 */
const validateLogin = [
  body('login')
    .trim()
    .notEmpty().withMessage('Login (username ou email) é obrigatório')
    .isLength({ min: 3, max: 100 }).withMessage('Login inválido'),

  body('password')
    .notEmpty().withMessage('Senha é obrigatória'),

  handleValidationErrors
];

/**
 * Validações para criação de usuário (admin)
 */
const validateCreateUser = [
  body('first_name')
    .trim()
    .notEmpty().withMessage('Primeiro nome é obrigatório')
    .isLength({ min: 2, max: 50 }).withMessage('Primeiro nome deve ter entre 2 e 50 caracteres')
    .matches(/^[a-zA-ZÀ-ÿ\s]+$/).withMessage('Primeiro nome deve conter apenas letras')
    .escape(),

  body('last_name')
    .trim()
    .notEmpty().withMessage('Sobrenome é obrigatório')
    .isLength({ min: 2, max: 50 }).withMessage('Sobrenome deve ter entre 2 e 50 caracteres')
    .matches(/^[a-zA-ZÀ-ÿ\s]+$/).withMessage('Sobrenome deve conter apenas letras')
    .escape(),

  body('username')
    .trim()
    .notEmpty().withMessage('Username é obrigatório')
    .isLength({ min: 3, max: 30 }).withMessage('Username deve ter entre 3 e 30 caracteres')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username deve conter apenas letras, números e underscore')
    .escape(),

  body('email')
    .trim()
    .notEmpty().withMessage('Email é obrigatório')
    .isEmail().withMessage('Email inválido')
    .normalizeEmail()
    .isLength({ max: 100 }).withMessage('Email deve ter no máximo 100 caracteres'),

  body('password')
    .notEmpty().withMessage('Senha é obrigatória')
    .isLength({ min: 6 }).withMessage('Senha deve ter no mínimo 6 caracteres'),

  body('role')
    .optional()
    .trim()
    .isIn(['admin', 'user']).withMessage('Role deve ser "admin" ou "user"')
    .escape(),

  handleValidationErrors
];

/**
 * Validações para atualização de perfil
 */
const validateUpdateProfile = [
  body('first_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('Primeiro nome deve ter entre 2 e 50 caracteres')
    .matches(/^[a-zA-ZÀ-ÿ\s]+$/).withMessage('Primeiro nome deve conter apenas letras')
    .escape(),

  body('last_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('Sobrenome deve ter entre 2 e 50 caracteres')
    .matches(/^[a-zA-ZÀ-ÿ\s]+$/).withMessage('Sobrenome deve conter apenas letras')
    .escape(),

  body('phone')
    .optional()
    .trim()
    .matches(/^[0-9\s\-\+\(\)]+$/).withMessage('Telefone inválido')
    .isLength({ max: 20 }).withMessage('Telefone deve ter no máximo 20 caracteres')
    .escape(),

  body('date_of_birth')
    .optional()
    .isISO8601().withMessage('Data de nascimento inválida')
    .toDate(),

  body('gender')
    .optional()
    .trim()
    .isIn(['male', 'female', 'other', 'prefer_not_to_say']).withMessage('Gênero inválido')
    .escape(),

  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Biografia deve ter no máximo 500 caracteres')
    .escape(),

  body('preferred_language')
    .optional()
    .trim()
    .isLength({ max: 10 }).withMessage('Idioma inválido')
    .matches(/^[a-z]{2}(-[A-Z]{2})?$/).withMessage('Formato de idioma inválido (ex: pt-BR)')
    .escape(),

  body('timezone')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Timezone inválido')
    .escape(),

  handleValidationErrors
];

/**
 * Validações para alteração de senha
 */
const validateChangePassword = [
  body('currentPassword')
    .notEmpty().withMessage('Senha atual é obrigatória'),

  body('newPassword')
    .notEmpty().withMessage('Nova senha é obrigatória')
    .isLength({ min: 6 }).withMessage('Nova senha deve ter no mínimo 6 caracteres'),

  handleValidationErrors
];

/**
 * Validações para alteração de senha por admin
 */
const validateAdminChangePassword = [
  param('id')
    .isInt({ min: 1 }).withMessage('ID de usuário inválido')
    .toInt(),

  body('newPassword')
    .notEmpty().withMessage('Nova senha é obrigatória')
    .isLength({ min: 6 }).withMessage('Nova senha deve ter no mínimo 6 caracteres'),

  handleValidationErrors
];

/**
 * Validações para solicitação de reset de senha
 */
const validatePasswordResetRequest = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email é obrigatório')
    .isEmail().withMessage('Email inválido')
    .normalizeEmail(),

  handleValidationErrors
];

/**
 * Validações para validação de token de reset
 */
const validatePasswordResetToken = [
  body('token')
    .trim()
    .notEmpty().withMessage('Token é obrigatório')
    .isLength({ min: 10 }).withMessage('Token inválido'),

  handleValidationErrors
];

/**
 * Validações para reset de senha
 */
const validatePasswordReset = [
  body('token')
    .trim()
    .notEmpty().withMessage('Token é obrigatório')
    .isLength({ min: 10 }).withMessage('Token inválido'),

  body('newPassword')
    .notEmpty().withMessage('Nova senha é obrigatória')
    .isLength({ min: 6 }).withMessage('Nova senha deve ter no mínimo 6 caracteres'),

  handleValidationErrors
];

/**
 * Validações para preferências de usuário
 */
const validatePreferences = [
  body('theme_mode')
    .optional()
    .trim()
    .isIn(['light', 'dark', 'system']).withMessage('Modo de tema deve ser "light", "dark" ou "system"')
    .escape(),

  body('theme_color')
    .optional()
    .trim()
    .isLength({ max: 30 }).withMessage('Cor do tema deve ter no máximo 30 caracteres')
    .matches(/^[a-zA-Z0-9#\-]+$/).withMessage('Cor do tema inválida')
    .escape(),

  body('font_size')
    .optional()
    .trim()
    .isIn(['small', 'medium', 'large', 'extra-large']).withMessage('Tamanho de fonte inválido')
    .escape(),

  body('compact_mode')
    .optional()
    .isBoolean().withMessage('Modo compacto deve ser true ou false')
    .toBoolean(),

  body('animations_enabled')
    .optional()
    .isBoolean().withMessage('Animações devem ser true ou false')
    .toBoolean(),

  body('high_contrast')
    .optional()
    .isBoolean().withMessage('Alto contraste deve ser true ou false')
    .toBoolean(),

  body('reduce_motion')
    .optional()
    .isBoolean().withMessage('Reduzir movimento deve ser true ou false')
    .toBoolean(),

  handleValidationErrors
];

/**
 * Validações para tema (PATCH)
 */
const validateTheme = [
  body('theme_mode')
    .optional()
    .trim()
    .isIn(['light', 'dark', 'system']).withMessage('Modo de tema deve ser "light", "dark" ou "system"')
    .escape(),

  body('theme_color')
    .optional()
    .trim()
    .isLength({ max: 30 }).withMessage('Cor do tema deve ter no máximo 30 caracteres')
    .matches(/^[a-zA-Z0-9#\-]+$/).withMessage('Cor do tema inválida')
    .escape(),

  handleValidationErrors
];

/**
 * Validações para ID de usuário em parâmetros de rota
 */
const validateUserId = [
  param('id')
    .isInt({ min: 1 }).withMessage('ID de usuário inválido')
    .toInt(),

  handleValidationErrors
];

/**
 * Validações para ID de usuário em preferências (opcional)
 */
const validateUserIdOptional = [
  param('userId')
    .optional()
    .isInt({ min: 1 }).withMessage('ID de usuário inválido')
    .toInt(),

  handleValidationErrors
];

/**
 * Validações para refresh token
 */
const validateRefreshToken = [
  body('refreshToken')
    .trim()
    .notEmpty().withMessage('Refresh token é obrigatório'),

  handleValidationErrors
];

module.exports = {
  validateRegister,
  validateLogin,
  validateCreateUser,
  validateUpdateProfile,
  validateChangePassword,
  validateAdminChangePassword,
  validatePasswordResetRequest,
  validatePasswordResetToken,
  validatePasswordReset,
  validatePreferences,
  validateTheme,
  validateUserId,
  validateUserIdOptional,
  validateRefreshToken,
  handleValidationErrors
};
