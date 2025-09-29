const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Funções auxiliares para JWT
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      username: user.username
    },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
};

// Função auxiliar para tratamento de erros do PostgreSQL
const handleDatabaseError = (error) => {
  const errorMap = {
    '23505': { status: 409, message: 'Dados duplicados: Username ou email já existe' },
    '23502': { status: 400, message: 'Campo obrigatório não fornecido' },
    '23503': { status: 400, message: 'Referência inválida' },
    '22001': { status: 400, message: 'Valor muito longo para o campo' },
    '22003': { status: 400, message: 'Valor numérico fora do intervalo' },
    '22007': { status: 400, message: 'Formato de data/hora inválido' },
    '22P02': { status: 400, message: 'Formato de dados inválido' },
    '42703': { status: 500, message: 'Erro de estrutura: Coluna não encontrada' },
    '42P01': { status: 500, message: 'Erro de estrutura: Tabela não encontrada' },
    'ECONNREFUSED': { status: 503, message: 'Banco de dados indisponível' },
    'ENOTFOUND': { status: 503, message: 'Não foi possível conectar ao banco de dados' }
  };

  const errorCode = error.code || error.errno;
  return errorMap[errorCode] || { status: 500, message: 'Erro interno do servidor' };
};

const getAllUsers = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        first_name,
        last_name,
        username,
        email,
        status,
        email_verified,
        created_at
      FROM users
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
    `);

    if (result.rows.length === 0) {
      return res.status(200).json({
        message: 'Nenhum usuário encontrado',
        data: [],
        count: 0
      });
    }

    res.status(200).json({
      message: 'Usuários encontrados com sucesso',
      data: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Erro ao buscar usuários:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });

    const { status, message } = handleDatabaseError(error);
    res.status(status).json({
      error: message,
      timestamp: new Date().toISOString(),
      path: req.path
    });
  }
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validar se o ID é um número válido
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        error: 'ID do usuário inválido',
        message: 'O ID deve ser um número válido',
        timestamp: new Date().toISOString(),
        path: req.path
      });
    }

    const result = await pool.query(`
      SELECT
        id,
        first_name,
        last_name,
        username,
        email,
        phone,
        date_of_birth,
        gender,
        profile_image_url,
        bio,
        status,
        email_verified,
        phone_verified,
        preferred_language,
        timezone,
        last_login_at,
        created_at,
        updated_at
      FROM users
      WHERE id = $1 AND deleted_at IS NULL
    `, [parseInt(id)]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Usuário não encontrado',
        message: `Usuário com ID ${id} não existe ou foi removido`,
        timestamp: new Date().toISOString(),
        path: req.path
      });
    }

    res.status(200).json({
      message: 'Usuário encontrado com sucesso',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Erro ao buscar usuário:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      userId: req.params.id,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });

    const { status, message } = handleDatabaseError(error);
    res.status(status).json({
      error: message,
      timestamp: new Date().toISOString(),
      path: req.path
    });
  }
};

const createUser = async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      username,
      email,
      password,
      phone,
      date_of_birth,
      gender
    } = req.body;

    // Validações detalhadas
    const missingFields = [];
    if (!first_name) missingFields.push('first_name');
    if (!last_name) missingFields.push('last_name');
    if (!username) missingFields.push('username');
    if (!email) missingFields.push('email');
    if (!password) missingFields.push('password');

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: 'Campos obrigatórios ausentes',
        message: `Os seguintes campos são obrigatórios: ${missingFields.join(', ')}`,
        missing_fields: missingFields,
        timestamp: new Date().toISOString(),
        path: req.path
      });
    }

    // Validações de formato
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Email inválido',
        message: 'O formato do email não é válido',
        timestamp: new Date().toISOString(),
        path: req.path
      });
    }

    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({
        error: 'Username inválido',
        message: 'O username deve ter entre 3 e 30 caracteres',
        timestamp: new Date().toISOString(),
        path: req.path
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'Senha muito fraca',
        message: 'A senha deve ter pelo menos 6 caracteres',
        timestamp: new Date().toISOString(),
        path: req.path
      });
    }

    if (gender && !['male', 'female', 'other', 'prefer_not_to_say'].includes(gender)) {
      return res.status(400).json({
        error: 'Gênero inválido',
        message: 'Gênero deve ser: male, female, other ou prefer_not_to_say',
        timestamp: new Date().toISOString(),
        path: req.path
      });
    }

    // Verificar se username ou email já existem
    const existingUser = await pool.query(
      'SELECT username, email FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      const conflicts = [];
      existingUser.rows.forEach(user => {
        if (user.username === username) conflicts.push('username');
        if (user.email === email) conflicts.push('email');
      });

      return res.status(409).json({
        error: 'Dados já existem',
        message: `Os seguintes dados já estão em uso: ${conflicts.join(', ')}`,
        conflicts: conflicts,
        timestamp: new Date().toISOString(),
        path: req.path
      });
    }

    // Hash da senha
    const password_hash = await bcrypt.hash(password, 10);

    const result = await pool.query(`
      INSERT INTO users (
        first_name,
        last_name,
        username,
        email,
        password_hash,
        phone,
        date_of_birth,
        gender
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING
        id,
        first_name,
        last_name,
        username,
        email,
        phone,
        date_of_birth,
        gender,
        status,
        created_at
    `, [first_name, last_name, username, email, password_hash, phone, date_of_birth, gender]);

    res.status(201).json({
      message: 'Usuário criado com sucesso',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Erro ao criar usuário:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      constraint: error.constraint,
      requestBody: { ...req.body, password: '[REDACTED]' },
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });

    const { status, message } = handleDatabaseError(error);
    res.status(status).json({
      error: message,
      timestamp: new Date().toISOString(),
      path: req.path
    });
  }
};

const register = async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      username,
      email,
      password,
      phone,
      date_of_birth,
      gender
    } = req.body;

    // Validações detalhadas
    const missingFields = [];
    if (!first_name) missingFields.push('first_name');
    if (!last_name) missingFields.push('last_name');
    if (!username) missingFields.push('username');
    if (!email) missingFields.push('email');
    if (!password) missingFields.push('password');

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: 'Campos obrigatórios ausentes',
        message: `Os seguintes campos são obrigatórios: ${missingFields.join(', ')}`,
        missing_fields: missingFields,
        timestamp: new Date().toISOString(),
        path: req.path
      });
    }

    // Validações de formato
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Email inválido',
        message: 'O formato do email não é válido',
        timestamp: new Date().toISOString(),
        path: req.path
      });
    }

    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({
        error: 'Username inválido',
        message: 'O username deve ter entre 3 e 30 caracteres',
        timestamp: new Date().toISOString(),
        path: req.path
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'Senha muito fraca',
        message: 'A senha deve ter pelo menos 6 caracteres',
        timestamp: new Date().toISOString(),
        path: req.path
      });
    }

    if (gender && !['male', 'female', 'other', 'prefer_not_to_say'].includes(gender)) {
      return res.status(400).json({
        error: 'Gênero inválido',
        message: 'Gênero deve ser: male, female, other ou prefer_not_to_say',
        timestamp: new Date().toISOString(),
        path: req.path
      });
    }

    // Verificar se username ou email já existem
    const existingUser = await pool.query(
      'SELECT username, email FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      const conflicts = [];
      existingUser.rows.forEach(user => {
        if (user.username === username) conflicts.push('username');
        if (user.email === email) conflicts.push('email');
      });

      return res.status(409).json({
        error: 'Dados já existem',
        message: `Os seguintes dados já estão em uso: ${conflicts.join(', ')}`,
        conflicts: conflicts,
        timestamp: new Date().toISOString(),
        path: req.path
      });
    }

    // Hash da senha
    const password_hash = await bcrypt.hash(password, 10);

    // Inserir novo usuário
    const result = await pool.query(
      `INSERT INTO users (
        first_name, last_name, username, email, password_hash,
        phone, date_of_birth, gender, terms_accepted_at, privacy_policy_accepted_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id, first_name, last_name, username, email, phone, date_of_birth, gender, created_at`,
      [first_name, last_name, username, email, password_hash, phone, date_of_birth, gender]
    );

    const user = result.rows[0];
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    res.status(201).json({
      message: 'Usuário cadastrado com sucesso',
      user,
      token,
      refreshToken
    });
  } catch (error) {
    console.error('Erro ao cadastrar usuário:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      constraint: error.constraint,
      requestBody: { ...req.body, password: '[REDACTED]' },
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });

    const { status, message } = handleDatabaseError(error);
    res.status(status).json({
      error: message,
      timestamp: new Date().toISOString(),
      path: req.path
    });
  }
};

const login = async (req, res) => {
  try {
    const { login, password } = req.body;

    if (!login || !password) {
      return res.status(400).json({
        error: 'Login e senha são obrigatórios',
        timestamp: new Date().toISOString(),
        path: req.path
      });
    }

    // Buscar usuário por username ou email
    const result = await pool.query(
      `SELECT id, first_name, last_name, username, email, password_hash,
              status, email_verified, login_attempts, locked_until
       FROM users
       WHERE (username = $1 OR email = $1) AND deleted_at IS NULL`,
      [login]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Credenciais inválidas',
        timestamp: new Date().toISOString(),
        path: req.path
      });
    }

    const user = result.rows[0];

    // Verificar se a conta está bloqueada
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return res.status(423).json({
        error: 'Conta temporariamente bloqueada. Tente novamente mais tarde.',
        timestamp: new Date().toISOString(),
        path: req.path
      });
    }

    // Verificar se a conta está ativa
    if (user.status !== 'active') {
      return res.status(403).json({
        error: 'Conta inativa ou suspensa',
        timestamp: new Date().toISOString(),
        path: req.path
      });
    }

    // Verificar senha
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      // Incrementar tentativas de login
      const newAttempts = user.login_attempts + 1;
      let updateQuery = 'UPDATE users SET login_attempts = $1';
      const queryParams = [newAttempts, user.id];

      // Bloquear conta após 5 tentativas
      if (newAttempts >= 5) {
        const lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos
        updateQuery += ', locked_until = $3';
        queryParams.push(lockUntil);
      }

      updateQuery += ' WHERE id = $2';
      await pool.query(updateQuery, queryParams);

      return res.status(401).json({
        error: 'Credenciais inválidas',
        timestamp: new Date().toISOString(),
        path: req.path
      });
    }

    // Resetar tentativas de login e atualizar último login
    await pool.query(
      'UPDATE users SET login_attempts = 0, locked_until = NULL, last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Remover dados sensíveis
    delete user.password_hash;
    delete user.login_attempts;
    delete user.locked_until;

    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    res.json({
      message: 'Login realizado com sucesso',
      user,
      token,
      refreshToken
    });
  } catch (error) {
    console.error('Erro ao realizar login:', error);
    const { status, message } = handleDatabaseError(error);
    res.status(status).json({
      error: message,
      timestamp: new Date().toISOString(),
      path: req.path
    });
  }
};

const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Refresh token é obrigatório',
        timestamp: new Date().toISOString(),
        path: req.path
      });
    }

    jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(403).json({
          error: 'Refresh token inválido ou expirado',
          timestamp: new Date().toISOString(),
          path: req.path
        });
      }

      // Buscar dados atualizados do usuário
      const result = await pool.query(
        'SELECT id, first_name, last_name, username, email FROM users WHERE id = $1 AND status = $2 AND deleted_at IS NULL',
        [decoded.id, 'active']
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Usuário não encontrado',
          timestamp: new Date().toISOString(),
          path: req.path
        });
      }

      const user = result.rows[0];
      const newToken = generateToken(user);
      const newRefreshToken = generateRefreshToken(user);

      res.json({
        token: newToken,
        refreshToken: newRefreshToken
      });
    });
  } catch (error) {
    console.error('Erro ao renovar token:', error);
    const { status, message } = handleDatabaseError(error);
    res.status(status).json({
      error: message,
      timestamp: new Date().toISOString(),
      path: req.path
    });
  }
};

const getProfile = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, first_name, last_name, username, email, phone,
              date_of_birth, gender, profile_image_url, bio, status,
              email_verified, phone_verified, two_factor_enabled,
              preferred_language, timezone, last_login_at, created_at
       FROM users
       WHERE id = $1 AND deleted_at IS NULL`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Usuário não encontrado',
        timestamp: new Date().toISOString(),
        path: req.path
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    const { status, message } = handleDatabaseError(error);
    res.status(status).json({
      error: message,
      timestamp: new Date().toISOString(),
      path: req.path
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      phone,
      date_of_birth,
      gender,
      profile_image_url,
      bio,
      preferred_language,
      timezone
    } = req.body;

    const result = await pool.query(
      `UPDATE users
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           phone = COALESCE($3, phone),
           date_of_birth = COALESCE($4, date_of_birth),
           gender = COALESCE($5, gender),
           profile_image_url = COALESCE($6, profile_image_url),
           bio = COALESCE($7, bio),
           preferred_language = COALESCE($8, preferred_language),
           timezone = COALESCE($9, timezone)
       WHERE id = $10 AND deleted_at IS NULL
       RETURNING id, first_name, last_name, username, email, phone,
                 date_of_birth, gender, profile_image_url, bio,
                 preferred_language, timezone`,
      [first_name, last_name, phone, date_of_birth, gender, profile_image_url,
        bio, preferred_language, timezone, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Usuário não encontrado',
        timestamp: new Date().toISOString(),
        path: req.path
      });
    }

    res.json({
      message: 'Perfil atualizado com sucesso',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    const { status, message } = handleDatabaseError(error);
    res.status(status).json({
      error: message,
      timestamp: new Date().toISOString(),
      path: req.path
    });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, adminOverride } = req.body;
    // Se não passar ID nos params, usa o ID do usuário logado
    const targetUserId = req.params.id ? parseInt(req.params.id) : req.user.id;
    const isChangingOwnPassword = targetUserId === req.user.id;

    // Validar ID se foi fornecido
    if (req.params.id && isNaN(targetUserId)) {
      return res.status(400).json({
        error: 'ID do usuário inválido',
        message: 'O ID deve ser um número válido',
        timestamp: new Date().toISOString(),
        path: req.path
      });
    }

    if (!newPassword) {
      return res.status(400).json({
        error: 'Nova senha é obrigatória',
        timestamp: new Date().toISOString(),
        path: req.path
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: 'A nova senha deve ter no mínimo 6 caracteres',
        timestamp: new Date().toISOString(),
        path: req.path
      });
    }

    // Se está trocando a própria senha E não tem adminOverride, precisa validar a senha atual
    if (isChangingOwnPassword && adminOverride !== true) {
      if (!currentPassword) {
        return res.status(400).json({
          error: 'Senha atual é obrigatória para trocar sua própria senha',
          message: 'Para forçar a troca sem senha atual, envie "adminOverride": true no body',
          timestamp: new Date().toISOString(),
          path: req.path
        });
      }

      // Buscar senha atual do usuário
      const result = await pool.query(
        'SELECT password_hash FROM users WHERE id = $1',
        [targetUserId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Usuário não encontrado',
          timestamp: new Date().toISOString(),
          path: req.path
        });
      }

      // Verificar senha atual
      const passwordMatch = await bcrypt.compare(currentPassword, result.rows[0].password_hash);

      if (!passwordMatch) {
        return res.status(401).json({
          error: 'Senha atual incorreta',
          timestamp: new Date().toISOString(),
          path: req.path
        });
      }
    } else {
      // Se está trocando senha de outro usuário ou usando adminOverride, apenas verifica se existe
      const userExists = await pool.query(
        'SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL',
        [targetUserId]
      );

      if (userExists.rows.length === 0) {
        return res.status(404).json({
          error: 'Usuário não encontrado',
          timestamp: new Date().toISOString(),
          path: req.path
        });
      }
    }

    // Hash da nova senha
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Atualizar senha
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [newPasswordHash, targetUserId]
    );

    res.json({
      message: isChangingOwnPassword
        ? 'Senha alterada com sucesso'
        : `Senha do usuário ${targetUserId} alterada com sucesso`,
      adminOverride: adminOverride || false
    });
  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    const { status, message } = handleDatabaseError(error);
    res.status(status).json({
      error: message,
      timestamp: new Date().toISOString(),
      path: req.path
    });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  register,
  login,
  refreshToken,
  getProfile,
  updateProfile,
  changePassword
};