const { AppDataSource } = require('../config/typeorm');
const logger = require('../config/logger');

// Repository cache
let userPreferenceRepository = null;

const getRepositories = () => {
  if (!AppDataSource.isInitialized) {
    throw new Error('Database not initialized. Please ensure TypeORM is initialized before accessing repositories.');
  }
  if (!userPreferenceRepository) {
    userPreferenceRepository = AppDataSource.getRepository('UserPreference');
  }
  return { userPreferenceRepository };
};

/**
 * @desc    Obter preferências do usuário autenticado ou de outro (por ID)
 * @route   GET /api/preferences/:userId?
 * @access  Private
 */
const getUserPreferences = async (req, res) => {
  try {
    // Se userId for passado como parâmetro, usa ele. Senão, usa o usuário autenticado
    const userId = req.params.userId ? parseInt(req.params.userId) : req.user.id;

    // Validar se o ID é válido (quando fornecido)
    if (req.params.userId && isNaN(userId)) {
      return res.status(400).json({
        error: 'ID inválido',
        message: 'O userId deve ser um número válido'
      });
    }

    const { userPreferenceRepository } = getRepositories();

    const preferences = await userPreferenceRepository.findOne({
      where: { user_id: userId },
      select: [
        'id',
        'user_id',
        'theme_mode',
        'theme_color',
        'font_size',
        'compact_mode',
        'animations_enabled',
        'high_contrast',
        'reduce_motion',
        'created_at',
        'updated_at'
      ]
    });

    // If no preferences exist, return defaults
    if (!preferences) {
      return res.status(200).json({
        user_id: userId,
        theme_mode: 'system',
        theme_color: 'blue',
        font_size: 'medium',
        compact_mode: false,
        animations_enabled: true,
        high_contrast: false,
        reduce_motion: false,
        message: 'Preferências não encontradas, retornando valores padrão'
      });
    }

    logger.info('User preferences retrieved', {
      userId,
      requestedBy: req.user.id
    });

    res.status(200).json(preferences);
  } catch (error) {
    logger.error('Error retrieving user preferences', {
      userId: req.params.userId || req.user.id,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Erro ao buscar preferências',
      message: error.message
    });
  }
};

/**
 * @desc    Criar ou atualizar preferências do usuário autenticado ou de outro (por ID)
 * @route   PUT /api/preferences/:userId?
 * @access  Private
 */
const updateUserPreferences = async (req, res) => {
  try {
    // Se userId for passado como parâmetro, usa ele. Senão, usa o usuário autenticado
    const userId = req.params.userId ? parseInt(req.params.userId) : req.user.id;

    // Validar se o ID é válido (quando fornecido)
    if (req.params.userId && isNaN(userId)) {
      return res.status(400).json({
        error: 'ID inválido',
        message: 'O userId deve ser um número válido'
      });
    }

    const {
      theme_mode,
      theme_color,
      font_size,
      compact_mode,
      animations_enabled,
      high_contrast,
      reduce_motion
    } = req.body;

    // Validar se pelo menos um campo foi fornecido
    const hasAnyField = theme_mode !== undefined ||
      theme_color !== undefined ||
      font_size !== undefined ||
      compact_mode !== undefined ||
      animations_enabled !== undefined ||
      high_contrast !== undefined ||
      reduce_motion !== undefined;

    if (!hasAnyField) {
      return res.status(400).json({
        error: 'Validação falhou',
        message: 'Nenhum campo para atualizar foi fornecido'
      });
    }

    // Validar theme_mode
    if (theme_mode && !['light', 'dark', 'system'].includes(theme_mode)) {
      return res.status(400).json({
        error: 'Validação falhou',
        message: 'theme_mode deve ser "light", "dark" ou "system"'
      });
    }

    // Validar font_size
    if (font_size && !['small', 'medium', 'large', 'extra-large'].includes(font_size)) {
      return res.status(400).json({
        error: 'Validação falhou',
        message: 'font_size deve ser "small", "medium", "large" ou "extra-large"'
      });
    }

    const { userPreferenceRepository } = getRepositories();

    // Verificar se já existe preferências
    let preferences = await userPreferenceRepository.findOne({
      where: { user_id: userId }
    });

    if (!preferences) {
      // Criar novas preferências com valores fornecidos ou padrões
      preferences = userPreferenceRepository.create({
        user_id: userId,
        theme_mode: theme_mode || 'system',
        theme_color: theme_color || 'blue',
        font_size: font_size || 'medium',
        compact_mode: compact_mode !== undefined ? compact_mode : false,
        animations_enabled: animations_enabled !== undefined ? animations_enabled : true,
        high_contrast: high_contrast !== undefined ? high_contrast : false,
        reduce_motion: reduce_motion !== undefined ? reduce_motion : false
      });
    } else {
      // Atualizar apenas os campos fornecidos
      if (theme_mode !== undefined) preferences.theme_mode = theme_mode;
      if (theme_color !== undefined) preferences.theme_color = theme_color;
      if (font_size !== undefined) preferences.font_size = font_size;
      if (compact_mode !== undefined) preferences.compact_mode = compact_mode;
      if (animations_enabled !== undefined) preferences.animations_enabled = animations_enabled;
      if (high_contrast !== undefined) preferences.high_contrast = high_contrast;
      if (reduce_motion !== undefined) preferences.reduce_motion = reduce_motion;
    }

    const savedPreferences = await userPreferenceRepository.save(preferences);

    logger.info('User preferences updated', {
      userId,
      updatedBy: req.user.id
    });

    res.status(200).json({
      message: 'Preferências atualizadas com sucesso',
      preferences: savedPreferences
    });
  } catch (error) {
    logger.error('Error updating user preferences', {
      userId: req.params.userId || req.user.id,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Erro ao atualizar preferências',
      message: error.message
    });
  }
};

/**
 * @desc    Resetar preferências do usuário autenticado ou de outro (por ID)
 * @route   DELETE /api/preferences/:userId?
 * @access  Private
 */
const resetUserPreferences = async (req, res) => {
  try {
    // Se userId for passado como parâmetro, usa ele. Senão, usa o usuário autenticado
    const userId = req.params.userId ? parseInt(req.params.userId) : req.user.id;

    // Validar se o ID é válido (quando fornecido)
    if (req.params.userId && isNaN(userId)) {
      return res.status(400).json({
        error: 'ID inválido',
        message: 'O userId deve ser um número válido'
      });
    }

    const { userPreferenceRepository } = getRepositories();

    const result = await userPreferenceRepository.delete({
      user_id: userId
    });

    if (result.affected === 0) {
      return res.status(404).json({
        error: 'Não encontrado',
        message: 'Nenhuma preferência encontrada para resetar'
      });
    }

    logger.info('User preferences reset', {
      userId,
      resetBy: req.user.id
    });

    res.status(200).json({
      message: 'Preferências resetadas para valores padrão com sucesso'
    });
  } catch (error) {
    logger.error('Error resetting user preferences', {
      userId: req.params.userId || req.user.id,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Erro ao resetar preferências',
      message: error.message
    });
  }
};

/**
 * @desc    Atualizar apenas o tema (modo e cor)
 * @route   PATCH /api/preferences/theme
 * @access  Private
 */
const updateTheme = async (req, res) => {
  try {
    const userId = req.user.id;
    const { theme_mode, theme_color } = req.body;

    if (!theme_mode && !theme_color) {
      return res.status(400).json({
        error: 'Validação falhou',
        message: 'Forneça ao menos theme_mode ou theme_color'
      });
    }

    // Validar theme_mode
    if (theme_mode && !['light', 'dark', 'system'].includes(theme_mode)) {
      return res.status(400).json({
        error: 'Validação falhou',
        message: 'theme_mode deve ser "light", "dark" ou "system"'
      });
    }

    const { userPreferenceRepository } = getRepositories();

    // Verificar se já existe preferências
    let preferences = await userPreferenceRepository.findOne({
      where: { user_id: userId }
    });

    if (!preferences) {
      // Criar com valores padrão, mas com o tema especificado
      preferences = userPreferenceRepository.create({
        user_id: userId,
        theme_mode: theme_mode || 'system',
        theme_color: theme_color || 'blue'
      });
    } else {
      // Atualizar apenas os campos de tema
      if (theme_mode !== undefined) preferences.theme_mode = theme_mode;
      if (theme_color !== undefined) preferences.theme_color = theme_color;
    }

    const savedPreferences = await userPreferenceRepository.save(preferences);

    logger.info('User theme updated', {
      userId,
      theme_mode: savedPreferences.theme_mode,
      theme_color: savedPreferences.theme_color
    });

    res.status(200).json({
      message: 'Tema atualizado com sucesso',
      preferences: savedPreferences
    });
  } catch (error) {
    logger.error('Error updating user theme', {
      userId: req.user.id,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Erro ao atualizar tema',
      message: error.message
    });
  }
};

module.exports = {
  getUserPreferences,
  updateUserPreferences,
  resetUserPreferences,
  updateTheme
};
