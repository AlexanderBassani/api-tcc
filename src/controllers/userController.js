const pool = require('../config/database');

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
    const bcrypt = require('bcrypt');
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

module.exports = {
  getAllUsers,
  getUserById,
  createUser
};