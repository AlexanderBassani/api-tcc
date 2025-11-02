const { getUserPreferencesRepository } = require('../utils/repositories');

/**
 * @desc    Obter preferências do usuário autenticado ou de outro usuário (por ID)
 * @route   GET /api/preferences/:userId?
 * @access  Private
 */
const getUserPreferences = async (req, res) => {
  try {
    const preferencesRepo = getUserPreferencesRepository();

    // Se userId for passado como parâmetro, usa ele. Senão, usa o usuário autenticado
    const userId = req.params.userId ? parseInt(req.params.userId) : req.user.id;

    // Validar se o ID é válido (quando fornecido)
    if (req.params.userId && isNaN(userId)) {
      return res.status(400).json({
        error: 'ID inválido',
        message: 'O userId deve ser um número válido'
      });
    }

    const preferences = await preferencesRepo.findOne({
      where: { userId }
    });

    // Se não existir preferências (caso raro), retornar valores padrão
    if (!preferences) {
      return res.status(200).json({
        userId,
        themeMode: 'system',
        themeColor: 'blue',
        fontSize: 'medium',
        compactMode: false,
        animationsEnabled: true,
        highContrast: false,
        reduceMotion: false,
        message: 'Preferências não encontradas. Por favor, atualize suas preferências.'
      });
    }

    res.status(200).json(preferences);
  } catch (error) {
    console.error('Erro ao obter preferências:', error);
    res.status(500).json({
      error: 'Erro ao obter preferências',
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
    const preferencesRepo = getUserPreferencesRepository();

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

    // Verificar se já existe preferências para o usuário
    let preferences = await preferencesRepo.findOne({
      where: { userId }
    });

    if (!preferences) {
      // Criar novas preferências
      preferences = preferencesRepo.create({
        userId,
        themeMode: theme_mode || 'system',
        themeColor: theme_color || 'blue',
        fontSize: font_size || 'medium',
        compactMode: compact_mode !== undefined ? compact_mode : false,
        animationsEnabled: animations_enabled !== undefined ? animations_enabled : true,
        highContrast: high_contrast !== undefined ? high_contrast : false,
        reduceMotion: reduce_motion !== undefined ? reduce_motion : false
      });

      await preferencesRepo.save(preferences);
    } else {
      // Atualizar preferências existentes
      const updates = {};

      if (theme_mode !== undefined) updates.themeMode = theme_mode;
      if (theme_color !== undefined) updates.themeColor = theme_color;
      if (font_size !== undefined) updates.fontSize = font_size;
      if (compact_mode !== undefined) updates.compactMode = compact_mode;
      if (animations_enabled !== undefined) updates.animationsEnabled = animations_enabled;
      if (high_contrast !== undefined) updates.highContrast = high_contrast;
      if (reduce_motion !== undefined) updates.reduceMotion = reduce_motion;

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          error: 'Validação falhou',
          message: 'Nenhum campo para atualizar foi fornecido'
        });
      }

      await preferencesRepo.update({ userId }, updates);

      // Buscar preferências atualizadas
      preferences = await preferencesRepo.findOne({
        where: { userId }
      });
    }

    res.status(200).json({
      message: 'Preferências atualizadas com sucesso',
      preferences
    });
  } catch (error) {
    console.error('Erro ao atualizar preferências:', error);
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
    const preferencesRepo = getUserPreferencesRepository();

    // Se userId for passado como parâmetro, usa ele. Senão, usa o usuário autenticado
    const userId = req.params.userId ? parseInt(req.params.userId) : req.user.id;

    // Validar se o ID é válido (quando fornecido)
    if (req.params.userId && isNaN(userId)) {
      return res.status(400).json({
        error: 'ID inválido',
        message: 'O userId deve ser um número válido'
      });
    }

    const result = await preferencesRepo.delete({ userId });

    if (result.affected === 0) {
      return res.status(404).json({
        error: 'Não encontrado',
        message: 'Nenhuma preferência encontrada para resetar'
      });
    }

    res.status(200).json({
      message: 'Preferências resetadas para valores padrão com sucesso'
    });
  } catch (error) {
    console.error('Erro ao resetar preferências:', error);
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
    const preferencesRepo = getUserPreferencesRepository();
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

    // Verificar se já existe preferências
    let preferences = await preferencesRepo.findOne({
      where: { userId }
    });

    if (!preferences) {
      // Criar com valores padrão, mas com o tema especificado
      preferences = preferencesRepo.create({
        userId,
        themeMode: theme_mode || 'system',
        themeColor: theme_color || 'blue'
      });

      await preferencesRepo.save(preferences);
    } else {
      // Atualizar apenas os campos de tema
      const updates = {};

      if (theme_mode !== undefined) updates.themeMode = theme_mode;
      if (theme_color !== undefined) updates.themeColor = theme_color;

      await preferencesRepo.update({ userId }, updates);

      // Buscar preferências atualizadas
      preferences = await preferencesRepo.findOne({
        where: { userId }
      });
    }

    res.status(200).json({
      message: 'Tema atualizado com sucesso',
      preferences
    });
  } catch (error) {
    console.error('Erro ao atualizar tema:', error);
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
