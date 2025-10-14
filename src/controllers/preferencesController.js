const pool = require('../config/database');

/**
 * @desc    Obter preferências do usuário autenticado ou de outro usuário (por ID)
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

    const result = await pool.query(
      `SELECT
        id,
        user_id,
        theme_mode,
        theme_color,
        font_size,
        compact_mode,
        animations_enabled,
        high_contrast,
        reduce_motion,
        created_at,
        updated_at
      FROM user_preferences
      WHERE user_id = $1`,
      [userId]
    );

    // Se não existir preferências (caso raro), retornar valores padrão
    if (result.rows.length === 0) {
      return res.status(200).json({
        user_id: userId,
        theme_mode: 'system',
        theme_color: 'blue',
        font_size: 'medium',
        compact_mode: false,
        animations_enabled: true,
        high_contrast: false,
        reduce_motion: false,
        message: 'Preferências não encontradas. Por favor, atualize suas preferências.'
      });
    }

    res.status(200).json(result.rows[0]);
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
    const existingPrefs = await pool.query(
      'SELECT id FROM user_preferences WHERE user_id = $1',
      [userId]
    );

    let result;

    if (existingPrefs.rows.length === 0) {
      // Criar novas preferências
      result = await pool.query(
        `INSERT INTO user_preferences (
          user_id,
          theme_mode,
          theme_color,
          font_size,
          compact_mode,
          animations_enabled,
          high_contrast,
          reduce_motion
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING
          id,
          user_id,
          theme_mode,
          theme_color,
          font_size,
          compact_mode,
          animations_enabled,
          high_contrast,
          reduce_motion,
          created_at,
          updated_at`,
        [
          userId,
          theme_mode || 'system',
          theme_color || 'blue',
          font_size || 'medium',
          compact_mode !== undefined ? compact_mode : false,
          animations_enabled !== undefined ? animations_enabled : true,
          high_contrast !== undefined ? high_contrast : false,
          reduce_motion !== undefined ? reduce_motion : false
        ]
      );
    } else {
      // Atualizar preferências existentes
      // Construir query dinamicamente apenas com campos fornecidos
      const updates = [];
      const values = [];
      let paramCount = 1;

      if (theme_mode !== undefined) {
        updates.push(`theme_mode = $${paramCount++}`);
        values.push(theme_mode);
      }
      if (theme_color !== undefined) {
        updates.push(`theme_color = $${paramCount++}`);
        values.push(theme_color);
      }
      if (font_size !== undefined) {
        updates.push(`font_size = $${paramCount++}`);
        values.push(font_size);
      }
      if (compact_mode !== undefined) {
        updates.push(`compact_mode = $${paramCount++}`);
        values.push(compact_mode);
      }
      if (animations_enabled !== undefined) {
        updates.push(`animations_enabled = $${paramCount++}`);
        values.push(animations_enabled);
      }
      if (high_contrast !== undefined) {
        updates.push(`high_contrast = $${paramCount++}`);
        values.push(high_contrast);
      }
      if (reduce_motion !== undefined) {
        updates.push(`reduce_motion = $${paramCount++}`);
        values.push(reduce_motion);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          error: 'Validação falhou',
          message: 'Nenhum campo para atualizar foi fornecido'
        });
      }

      values.push(userId);

      result = await pool.query(
        `UPDATE user_preferences
        SET ${updates.join(', ')}
        WHERE user_id = $${paramCount}
        RETURNING
          id,
          user_id,
          theme_mode,
          theme_color,
          font_size,
          compact_mode,
          animations_enabled,
          high_contrast,
          reduce_motion,
          created_at,
          updated_at`,
        values
      );
    }

    res.status(200).json({
      message: 'Preferências atualizadas com sucesso',
      preferences: result.rows[0]
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
    // Se userId for passado como parâmetro, usa ele. Senão, usa o usuário autenticado
    const userId = req.params.userId ? parseInt(req.params.userId) : req.user.id;

    // Validar se o ID é válido (quando fornecido)
    if (req.params.userId && isNaN(userId)) {
      return res.status(400).json({
        error: 'ID inválido',
        message: 'O userId deve ser um número válido'
      });
    }

    const result = await pool.query(
      `DELETE FROM user_preferences
      WHERE user_id = $1
      RETURNING id`,
      [userId]
    );

    if (result.rows.length === 0) {
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
    const existingPrefs = await pool.query(
      'SELECT id FROM user_preferences WHERE user_id = $1',
      [userId]
    );

    let result;

    if (existingPrefs.rows.length === 0) {
      // Criar com valores padrão, mas com o tema especificado
      result = await pool.query(
        `INSERT INTO user_preferences (
          user_id,
          theme_mode,
          theme_color
        ) VALUES ($1, $2, $3)
        RETURNING
          id,
          user_id,
          theme_mode,
          theme_color,
          font_size,
          compact_mode,
          animations_enabled,
          high_contrast,
          reduce_motion,
          created_at,
          updated_at`,
        [
          userId,
          theme_mode || 'system',
          theme_color || 'blue'
        ]
      );
    } else {
      // Atualizar apenas os campos de tema
      const updates = [];
      const values = [];
      let paramCount = 1;

      if (theme_mode !== undefined) {
        updates.push(`theme_mode = $${paramCount++}`);
        values.push(theme_mode);
      }
      if (theme_color !== undefined) {
        updates.push(`theme_color = $${paramCount++}`);
        values.push(theme_color);
      }

      values.push(userId);

      result = await pool.query(
        `UPDATE user_preferences
        SET ${updates.join(', ')}
        WHERE user_id = $${paramCount}
        RETURNING
          id,
          user_id,
          theme_mode,
          theme_color,
          font_size,
          compact_mode,
          animations_enabled,
          high_contrast,
          reduce_motion,
          created_at,
          updated_at`,
        values
      );
    }

    res.status(200).json({
      message: 'Tema atualizado com sucesso',
      preferences: result.rows[0]
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
