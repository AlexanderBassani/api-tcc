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

/**
 * Validações para criação de veículo
 */
const validateCreateVehicle = [
  body('brand')
    .trim()
    .notEmpty().withMessage('Marca é obrigatória')
    .isLength({ min: 1, max: 50 }).withMessage('Marca deve ter entre 1 e 50 caracteres')
    .matches(/^[a-zA-ZÀ-ÿ0-9\s\-\.]+$/).withMessage('Marca contém caracteres inválidos')
    .escape(),

  body('model')
    .trim()
    .notEmpty().withMessage('Modelo é obrigatório')
    .isLength({ min: 1, max: 100 }).withMessage('Modelo deve ter entre 1 e 100 caracteres')
    .matches(/^[a-zA-ZÀ-ÿ0-9\s\-\.]+$/).withMessage('Modelo contém caracteres inválidos')
    .escape(),

  body('year')
    .isInt({ min: 1900, max: new Date().getFullYear() + 1 }).withMessage(`Ano deve estar entre 1900 e ${new Date().getFullYear() + 1}`)
    .toInt(),

  body('plate')
    .trim()
    .notEmpty().withMessage('Placa é obrigatória')
    .isLength({ min: 7, max: 8 }).withMessage('Placa deve ter 7 ou 8 caracteres')
    .matches(/^[A-Z]{3}[0-9][A-Z][0-9]{2}$|^[A-Z]{3}[0-9]{4}$/i).withMessage('Formato de placa inválido (use ABC1234 ou ABC1D23)')
    .toUpperCase()
    .escape(),

  body('color')
    .optional()
    .trim()
    .isLength({ max: 30 }).withMessage('Cor deve ter no máximo 30 caracteres')
    .matches(/^[a-zA-ZÀ-ÿ\s]+$/).withMessage('Cor deve conter apenas letras')
    .escape(),

  body('current_km')
    .optional()
    .isInt({ min: 0 }).withMessage('Quilometragem deve ser um número positivo')
    .toInt(),

  body('purchase_date')
    .optional()
    .isISO8601().withMessage('Data de compra inválida')
    .toDate(),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Observações devem ter no máximo 1000 caracteres')
    .escape(),

  handleValidationErrors
];

/**
 * Validações para atualização de veículo
 */
const validateUpdateVehicle = [
  body('brand')
    .trim()
    .notEmpty().withMessage('Marca é obrigatória')
    .isLength({ min: 1, max: 50 }).withMessage('Marca deve ter entre 1 e 50 caracteres')
    .matches(/^[a-zA-ZÀ-ÿ0-9\s\-\.]+$/).withMessage('Marca contém caracteres inválidos')
    .escape(),

  body('model')
    .trim()
    .notEmpty().withMessage('Modelo é obrigatório')
    .isLength({ min: 1, max: 100 }).withMessage('Modelo deve ter entre 1 e 100 caracteres')
    .matches(/^[a-zA-ZÀ-ÿ0-9\s\-\.]+$/).withMessage('Modelo contém caracteres inválidos')
    .escape(),

  body('year')
    .isInt({ min: 1900, max: new Date().getFullYear() + 1 }).withMessage(`Ano deve estar entre 1900 e ${new Date().getFullYear() + 1}`)
    .toInt(),

  body('plate')
    .trim()
    .notEmpty().withMessage('Placa é obrigatória')
    .isLength({ min: 7, max: 8 }).withMessage('Placa deve ter 7 ou 8 caracteres')
    .matches(/^[A-Z]{3}[0-9][A-Z][0-9]{2}$|^[A-Z]{3}[0-9]{4}$/i).withMessage('Formato de placa inválido (use ABC1234 ou ABC1D23)')
    .toUpperCase()
    .escape(),

  body('color')
    .optional()
    .trim()
    .isLength({ max: 30 }).withMessage('Cor deve ter no máximo 30 caracteres')
    .matches(/^[a-zA-ZÀ-ÿ\s]+$/).withMessage('Cor deve conter apenas letras')
    .escape(),

  body('current_km')
    .isInt({ min: 0 }).withMessage('Quilometragem deve ser um número positivo')
    .toInt(),

  body('purchase_date')
    .optional()
    .isISO8601().withMessage('Data de compra inválida')
    .toDate(),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Observações devem ter no máximo 1000 caracteres')
    .escape(),

  handleValidationErrors
];

/**
 * Validações para ID de veículo em parâmetros de rota
 */
const validateVehicleId = [
  param('id')
    .isInt({ min: 1 }).withMessage('ID do veículo inválido')
    .toInt(),

  handleValidationErrors
];

/**
 * Validações para criação de manutenção
 */
const validateCreateMaintenance = [
  body('vehicle_id')
    .isInt({ min: 1 }).withMessage('ID do veículo deve ser um número inteiro positivo')
    .toInt(),

  body('service_provider_id')
    .optional()
    .isInt({ min: 1 }).withMessage('ID do prestador de serviço deve ser um número inteiro positivo')
    .toInt(),

  body('type')
    .trim()
    .notEmpty().withMessage('Tipo de manutenção é obrigatório')
    .isLength({ min: 2, max: 100 }).withMessage('Tipo de manutenção deve ter entre 2 e 100 caracteres')
    .matches(/^[a-zA-ZÀ-ÿ0-9\s\-\.\(\)\/]+$/).withMessage('Tipo de manutenção contém caracteres inválidos')
    .escape(),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Descrição deve ter no máximo 2000 caracteres')
    .escape(),

  body('cost')
    .optional()
    .isFloat({ min: 0 }).withMessage('Custo deve ser um valor positivo')
    .toFloat(),

  body('km_at_service')
    .optional()
    .isInt({ min: 0 }).withMessage('Quilometragem no serviço deve ser um número positivo')
    .toInt(),

  body('service_date')
    .isISO8601().withMessage('Data de serviço inválida (use formato YYYY-MM-DD)')
    .toDate(),

  body('next_service_km')
    .optional()
    .isInt({ min: 0 }).withMessage('Próxima quilometragem de serviço deve ser um número positivo')
    .toInt(),

  body('next_service_date')
    .optional()
    .isISO8601().withMessage('Próxima data de serviço inválida (use formato YYYY-MM-DD)')
    .toDate(),

  body('invoice_number')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Número da nota fiscal deve ter no máximo 50 caracteres')
    .matches(/^[a-zA-Z0-9\-\/\s]+$/).withMessage('Número da nota fiscal contém caracteres inválidos')
    .escape(),

  body('warranty_until')
    .optional()
    .isISO8601().withMessage('Data de garantia inválida (use formato YYYY-MM-DD)')
    .toDate(),

  handleValidationErrors
];

/**
 * Validações para atualização de manutenção
 */
const validateUpdateMaintenance = [
  body('service_provider_id')
    .optional()
    .isInt({ min: 1 }).withMessage('ID do prestador de serviço deve ser um número inteiro positivo')
    .toInt(),

  body('type')
    .trim()
    .notEmpty().withMessage('Tipo de manutenção é obrigatório')
    .isLength({ min: 2, max: 100 }).withMessage('Tipo de manutenção deve ter entre 2 e 100 caracteres')
    .matches(/^[a-zA-ZÀ-ÿ0-9\s\-\.\(\)\/]+$/).withMessage('Tipo de manutenção contém caracteres inválidos')
    .escape(),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Descrição deve ter no máximo 2000 caracteres')
    .escape(),

  body('cost')
    .optional()
    .isFloat({ min: 0 }).withMessage('Custo deve ser um valor positivo')
    .toFloat(),

  body('km_at_service')
    .optional()
    .isInt({ min: 0 }).withMessage('Quilometragem no serviço deve ser um número positivo')
    .toInt(),

  body('service_date')
    .isISO8601().withMessage('Data de serviço inválida (use formato YYYY-MM-DD)')
    .toDate(),

  body('next_service_km')
    .optional()
    .isInt({ min: 0 }).withMessage('Próxima quilometragem de serviço deve ser um número positivo')
    .toInt(),

  body('next_service_date')
    .optional()
    .isISO8601().withMessage('Próxima data de serviço inválida (use formato YYYY-MM-DD)')
    .toDate(),

  body('invoice_number')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Número da nota fiscal deve ter no máximo 50 caracteres')
    .matches(/^[a-zA-Z0-9\-\/\s]+$/).withMessage('Número da nota fiscal contém caracteres inválidos')
    .escape(),

  body('warranty_until')
    .optional()
    .isISO8601().withMessage('Data de garantia inválida (use formato YYYY-MM-DD)')
    .toDate(),

  handleValidationErrors
];

/**
 * Validações para ID de manutenção em parâmetros de rota
 */
const validateMaintenanceId = [
  param('id')
    .isInt({ min: 1 }).withMessage('ID da manutenção inválido')
    .toInt(),

  handleValidationErrors
];

/**
 * Validações para vehicleId em parâmetros de rota de manutenções
 */
const validateVehicleIdParam = [
  param('vehicleId')
    .isInt({ min: 1 }).withMessage('ID do veículo inválido')
    .toInt(),

  handleValidationErrors
];

/**
 * Validações para userId em parâmetros de rota
 */
const validateUserIdParam = [
  param('userId')
    .isInt({ min: 1 }).withMessage('ID de usuário inválido')
    .toInt(),

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
  validateCreateVehicle,
  validateUpdateVehicle,
  validateVehicleId,
  validateCreateMaintenance,
  validateUpdateMaintenance,
  validateMaintenanceId,
  validateVehicleIdParam,
  validateUserIdParam,
  handleValidationErrors
};
