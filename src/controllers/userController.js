/**
 * UserController - Versão TypeORM
 *
 * Este arquivo demonstra como migrar o userController.js para usar TypeORM
 * ao invés de pool.query direto.
 *
 * INSTRUÇÕES:
 * 1. Revisar e testar cada método migrado
 * 2. Quando aprovado, substituir o userController.js original
 * 3. Renomear este arquivo para userController.js
 */

const { AppDataSource } = require('../config/typeorm');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

// Repositories
let userRepository;
let preferencesRepository;

// Inicializar repositories quando o Data Source estiver pronto
const getRepositories = () => {
  if (!AppDataSource.isInitialized) {
    throw new Error('Database not initialized. Please ensure TypeORM is initialized before accessing repositories.');
  }
  if (!userRepository) {
    userRepository = AppDataSource.getRepository('User');
    preferencesRepository = AppDataSource.getRepository('UserPreference');
  }
  return { userRepository, preferencesRepository };
};

// ==================== FUNÇÕES AUXILIARES ====================

/**
 * Criar preferências padrão para um usuário
 */
const createDefaultPreferences = async (userId) => {
  try {
    const { preferencesRepository } = getRepositories();

    const preferences = preferencesRepository.create({
      user_id: userId,
      theme_mode: 'system',
      theme_color: 'blue',
      font_size: 'medium',
      compact_mode: false,
      animations_enabled: true,
      high_contrast: false,
      reduce_motion: false
    });

    await preferencesRepository.save(preferences);
    logger.info('Default preferences created', { userId });
  } catch (error) {
    logger.error('Failed to create default preferences', {
      userId,
      error: error.message,
      stack: error.stack
    });
    // Não falhar a criação do usuário se as preferências falharem
  }
};

/**
 * Gerar token JWT de acesso
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

/**
 * Gerar refresh token JWT
 */
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

/**
 * Tratamento de erros TypeORM/PostgreSQL
 */
const handleDatabaseError = (error) => {
  const errorMap = {
    '23505': { status: 409, message: 'Dados duplicados: Username ou email já existe' },
    '23502': { status: 400, message: 'Campo obrigatório não fornecido' },
    '23503': { status: 400, message: 'Referência inválida' },
    '22001': { status: 400, message: 'Valor muito longo para o campo' },
    '22003': { status: 400, message: 'Valor numérico fora do intervalo' },
    '22007': { status: 400, message: 'Formato de data/hora inválido' },
    '22P02': { status: 400, message: 'Formato de dados inválido' },
    'ECONNREFUSED': { status: 503, message: 'Banco de dados indisponível' },
    'ENOTFOUND': { status: 503, message: 'Não foi possível conectar ao banco de dados' }
  };

  const errorCode = error.code || error.errno || error.driverError?.code;
  return errorMap[errorCode] || { status: 500, message: 'Erro interno do servidor' };
};

// ==================== ENDPOINTS ====================

/**
 * GET /api/users
 * Listar todos os usuários (sem soft deleted)
 */
const getAllUsers = async (req, res) => {
  try {
    const { userRepository } = getRepositories();

    const users = await userRepository.find({
      where: { deleted_at: null },
      select: [
        'id',
        'first_name',
        'last_name',
        'username',
        'email',
        'role',
        'status',
        'email_verified',
        'created_at'
      ],
      order: { created_at: 'DESC' }
    });

    if (users.length === 0) {
      return res.status(200).json({
        message: 'Nenhum usuário encontrado',
        data: [],
        count: 0
      });
    }

    res.status(200).json({
      message: 'Usuários encontrados com sucesso',
      data: users,
      count: users.length
    });

  } catch (error) {
    logger.error('Failed to fetch users', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });

    const { status, message } = handleDatabaseError(error);
    res.status(status).json({
      error: message,
      timestamp: new Date().toISOString(),
      path: req.path
    });
  }
};

/**
 * GET /api/users/:id
 * Buscar usuário por ID
 */
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validar ID
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        error: 'ID do usuário inválido',
        message: 'O ID deve ser um número válido',
        timestamp: new Date().toISOString(),
        path: req.path
      });
    }

    const { userRepository } = getRepositories();

    const user = await userRepository.findOne({
      where: {
        id: parseInt(id),
        deleted_at: null
      },
      select: [
        'id',
        'first_name',
        'last_name',
        'username',
        'email',
        'role',
        'phone',
        'date_of_birth',
        'gender',
        'profile_image_url',
        'bio',
        'status',
        'email_verified',
        'phone_verified',
        'preferred_language',
        'timezone',
        'last_login_at',
        'created_at',
        'updated_at'
      ]
    });

    if (!user) {
      return res.status(404).json({
        error: 'Usuário não encontrado',
        message: `Usuário com ID ${id} não existe ou foi removido`,
        timestamp: new Date().toISOString(),
        path: req.path
      });
    }

    res.status(200).json({
      message: 'Usuário encontrado com sucesso',
      data: user
    });

  } catch (error) {
    logger.error('Failed to fetch user by ID', {
      message: error.message,
      userId: req.params.id,
      stack: error.stack
    });

    const { status, message } = handleDatabaseError(error);
    res.status(status).json({
      error: message,
      timestamp: new Date().toISOString(),
      path: req.path
    });
  }
};

/**
 * POST /api/users
 * Criar novo usuário (Admin only)
 */
const createUser = async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      username,
      email,
      password,
      role,
      phone,
      date_of_birth,
      gender
    } = req.body;

    // Validações
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

    const { userRepository } = getRepositories();

    // Verificar duplicidade (email ou username)
    const existingUser = await userRepository
      .createQueryBuilder('user')
      .where('user.email = :email OR user.username = :username', {
        email,
        username
      })
      .getOne();

    if (existingUser) {
      return res.status(409).json({
        error: 'Usuário já existe',
        message: 'Email ou username já está em uso',
        timestamp: new Date().toISOString(),
        path: req.path
      });
    }

    // Hash da senha
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Criar usuário
    const user = userRepository.create({
      first_name,
      last_name,
      username,
      email,
      password_hash,
      role: role || 'user',
      phone: phone || null,
      date_of_birth: date_of_birth || null,
      gender: gender || null,
      status: 'active'
    });

    const savedUser = await userRepository.save(user);

    // Criar preferências padrão (async, não bloqueia)
    createDefaultPreferences(savedUser.id);

    logger.info('User created successfully', {
      userId: savedUser.id,
      username: savedUser.username,
      email: savedUser.email,
      role: savedUser.role,
      createdBy: req.user?.id
    });

    // Remover password_hash do response
    delete savedUser.password_hash;

    res.status(201).json({
      message: 'Usuário criado com sucesso',
      data: savedUser
    });

  } catch (error) {
    logger.error('Failed to create user', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });

    const { status, message } = handleDatabaseError(error);
    res.status(status).json({
      error: message,
      timestamp: new Date().toISOString(),
      path: req.path
    });
  }
};

/**
 * POST /api/users/register
 * Registro de novo usuário (público)
 */
const register = async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      username,
      email,
      password,
      role
    } = req.body;

    // Validações
    const missingFields = [];
    if (!first_name) missingFields.push('first_name');
    if (!last_name) missingFields.push('last_name');
    if (!username) missingFields.push('username');
    if (!email) missingFields.push('email');
    if (!password) missingFields.push('password');

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: 'Campos obrigatórios não fornecidos',
        missing_fields: missingFields,
        timestamp: new Date().toISOString(),
        path: req.path
      });
    }

    const { userRepository } = getRepositories();

    // Verificar duplicidade
    const existingUser = await userRepository
      .createQueryBuilder('user')
      .where('user.email = :email OR user.username = :username', {
        email,
        username
      })
      .getOne();

    if (existingUser) {
      return res.status(409).json({
        error: 'Usuário já existe',
        message: 'Email ou username já está em uso'
      });
    }

    // Hash da senha
    const password_hash = await bcrypt.hash(password, 10);

    // Criar usuário
    const user = userRepository.create({
      first_name,
      last_name,
      username,
      email,
      password_hash,
      role: role || 'user',
      status: 'active'
    });

    const savedUser = await userRepository.save(user);

    // Criar preferências padrão
    await createDefaultPreferences(savedUser.id);

    // Gerar tokens
    const token = generateToken(savedUser);
    const refreshToken = generateRefreshToken(savedUser);

    logger.info('User registered successfully', {
      userId: savedUser.id,
      username: savedUser.username,
      email: savedUser.email
    });

    // Remover password_hash
    delete savedUser.password_hash;

    res.status(201).json({
      message: 'Usuário registrado com sucesso',
      user: savedUser,
      token,
      refreshToken
    });

  } catch (error) {
    logger.error('Registration failed', {
      message: error.message,
      stack: error.stack
    });

    const { status, message } = handleDatabaseError(error);
    res.status(status).json({ error: message });
  }
};

/**
 * POST /api/users/login
 * Login de usuário
 */
const login = async (req, res) => {
  try {
    const { login, password } = req.body;

    if (!login || !password) {
      return res.status(400).json({
        error: 'Credenciais não fornecidas',
        message: 'Login e senha são obrigatórios'
      });
    }

    const { userRepository } = getRepositories();

    // Buscar por email ou username
    const user = await userRepository
      .createQueryBuilder('user')
      .where('user.email = :login OR user.username = :login', { login })
      .andWhere('user.deleted_at IS NULL')
      .getOne();

    if (!user) {
      return res.status(401).json({
        error: 'Credenciais inválidas',
        message: 'Email/username ou senha incorretos'
      });
    }

    // Verificar senha
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      // Incrementar tentativas de login
      await userRepository.increment({ id: user.id }, 'login_attempts', 1);

      return res.status(401).json({
        error: 'Credenciais inválidas',
        message: 'Email/username ou senha incorretos'
      });
    }

    // Login bem-sucedido - resetar tentativas e atualizar last_login
    await userRepository.update(user.id, {
      login_attempts: 0,
      last_login_at: new Date()
    });

    // Gerar tokens
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    logger.info('User logged in successfully', {
      userId: user.id,
      username: user.username
    });

    // Remover senha do response
    delete user.password_hash;

    res.json({
      message: 'Login realizado com sucesso',
      user,
      token,
      refreshToken
    });

  } catch (error) {
    logger.error('Login failed', {
      message: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
};

/**
 * PUT /api/users/:id
 * Atualizar usuário
 */
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { userRepository } = getRepositories();

    // Verificar se usuário existe
    const user = await userRepository.findOne({
      where: { id: parseInt(id), deleted_at: null }
    });

    if (!user) {
      return res.status(404).json({
        error: 'Usuário não encontrado'
      });
    }

    // Não permitir atualização de campos sensíveis
    delete updates.password_hash;
    delete updates.id;
    delete updates.created_at;
    delete updates.deleted_at;

    // Atualizar
    await userRepository.update(id, updates);

    // Buscar usuário atualizado
    const updatedUser = await userRepository.findOne({
      where: { id: parseInt(id) },
      select: [
        'id',
        'first_name',
        'last_name',
        'username',
        'email',
        'role',
        'phone',
        'status',
        'updated_at'
      ]
    });

    logger.info('User updated', {
      userId: id,
      updatedBy: req.user?.id
    });

    res.json({
      message: 'Usuário atualizado com sucesso',
      data: updatedUser
    });

  } catch (error) {
    logger.error('Failed to update user', {
      userId: req.params.id,
      error: error.message
    });

    const { status, message } = handleDatabaseError(error);
    res.status(status).json({ error: message });
  }
};

/**
 * DELETE /api/users/:id
 * Deletar usuário (soft delete por padrão, hard delete com query param)
 */
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { hardDelete } = req.query;

    const { userRepository } = getRepositories();

    // Verificar se usuário existe
    const user = await userRepository.findOne({
      where: { id: parseInt(id) }
    });

    if (!user) {
      return res.status(404).json({
        error: 'Usuário não encontrado'
      });
    }

    if (hardDelete === 'true') {
      // Hard delete
      await userRepository.delete(id);

      logger.warn('User hard deleted', {
        userId: id,
        deletedBy: req.user?.id
      });

      res.json({
        message: 'Usuário excluído permanentemente'
      });
    } else {
      // Soft delete
      await userRepository.update(id, {
        deleted_at: new Date(),
        status: 'deleted'
      });

      logger.info('User soft deleted', {
        userId: id,
        deletedBy: req.user?.id
      });

      res.json({
        message: 'Usuário removido com sucesso'
      });
    }

  } catch (error) {
    logger.error('Failed to delete user', {
      userId: req.params.id,
      error: error.message
    });

    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
};

/**
 * POST /api/users/refresh-token
 * Renovar token de acesso usando refresh token
 */
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

      const { userRepository } = getRepositories();

      // Buscar dados atualizados do usuário
      const user = await userRepository.findOne({
        where: {
          id: decoded.id,
          status: 'active',
          deleted_at: null
        },
        select: ['id', 'first_name', 'last_name', 'username', 'email']
      });

      if (!user) {
        return res.status(404).json({
          error: 'Usuário não encontrado',
          timestamp: new Date().toISOString(),
          path: req.path
        });
      }

      const newToken = generateToken(user);
      const newRefreshToken = generateRefreshToken(user);

      res.json({
        token: newToken,
        refreshToken: newRefreshToken
      });
    });
  } catch (error) {
    logger.error('Token refresh failed', {
      message: error.message,
      stack: error.stack
    });
    const { status, message } = handleDatabaseError(error);
    res.status(status).json({
      error: message,
      timestamp: new Date().toISOString(),
      path: req.path
    });
  }
};

/**
 * GET /api/users/profile
 * Obter perfil do usuário autenticado
 */
const getProfile = async (req, res) => {
  try {
    const { userRepository } = getRepositories();

    const user = await userRepository.findOne({
      where: {
        id: req.user.id,
        deleted_at: null
      },
      select: [
        'id', 'first_name', 'last_name', 'username', 'email', 'role', 'phone',
        'date_of_birth', 'gender', 'profile_image_url', 'bio', 'status',
        'email_verified', 'phone_verified', 'two_factor_enabled',
        'preferred_language', 'timezone', 'last_login_at', 'created_at'
      ]
    });

    if (!user) {
      return res.status(404).json({
        error: 'Usuário não encontrado',
        timestamp: new Date().toISOString(),
        path: req.path
      });
    }

    res.json(user);
  } catch (error) {
    logger.error('Failed to fetch profile', {
      message: error.message,
      userId: req.user?.id,
      stack: error.stack
    });
    const { status, message } = handleDatabaseError(error);
    res.status(status).json({
      error: message,
      timestamp: new Date().toISOString(),
      path: req.path
    });
  }
};

/**
 * PUT /api/users/profile
 * Atualizar perfil do usuário autenticado
 */
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

    const { userRepository } = getRepositories();

    // Preparar dados para atualização (apenas campos não nulos)
    const updateData = {};
    if (first_name !== undefined) updateData.first_name = first_name;
    if (last_name !== undefined) updateData.last_name = last_name;
    if (phone !== undefined) updateData.phone = phone;
    if (date_of_birth !== undefined) updateData.date_of_birth = date_of_birth;
    if (gender !== undefined) updateData.gender = gender;
    if (profile_image_url !== undefined) updateData.profile_image_url = profile_image_url;
    if (bio !== undefined) updateData.bio = bio;
    if (preferred_language !== undefined) updateData.preferred_language = preferred_language;
    if (timezone !== undefined) updateData.timezone = timezone;

    // Atualizar usuário
    await userRepository.update(
      { id: req.user.id, deleted_at: null },
      updateData
    );

    // Buscar usuário atualizado
    const updatedUser = await userRepository.findOne({
      where: { id: req.user.id },
      select: [
        'id', 'first_name', 'last_name', 'username', 'email', 'phone',
        'date_of_birth', 'gender', 'profile_image_url', 'bio',
        'preferred_language', 'timezone'
      ]
    });

    if (!updatedUser) {
      return res.status(404).json({
        error: 'Usuário não encontrado',
        timestamp: new Date().toISOString(),
        path: req.path
      });
    }

    logger.info('Profile updated successfully', {
      userId: req.user.id,
      updatedFields: Object.keys(req.body)
    });

    res.json({
      message: 'Perfil atualizado com sucesso',
      user: updatedUser
    });
  } catch (error) {
    logger.error('Failed to update profile', {
      message: error.message,
      userId: req.user?.id,
      stack: error.stack
    });
    const { status, message } = handleDatabaseError(error);
    res.status(status).json({
      error: message,
      timestamp: new Date().toISOString(),
      path: req.path
    });
  }
};

/**
 * PUT /api/users/change-password
 * PUT /api/users/:id/change-password
 * Alterar senha do usuário (própria ou de outro usuário se admin)
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, adminOverride } = req.body;
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

    const { userRepository } = getRepositories();

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
      const user = await userRepository.findOne({
        where: { id: targetUserId },
        select: ['id', 'password_hash']
      });

      if (!user) {
        return res.status(404).json({
          error: 'Usuário não encontrado',
          timestamp: new Date().toISOString(),
          path: req.path
        });
      }

      // Verificar senha atual
      const passwordMatch = await bcrypt.compare(currentPassword, user.password_hash);

      if (!passwordMatch) {
        return res.status(401).json({
          error: 'Senha atual incorreta',
          timestamp: new Date().toISOString(),
          path: req.path
        });
      }
    } else {
      // Se está trocando senha de outro usuário ou usando adminOverride, apenas verifica se existe
      const userExists = await userRepository.findOne({
        where: {
          id: targetUserId,
          deleted_at: null
        },
        select: ['id']
      });

      if (!userExists) {
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
    await userRepository.update(targetUserId, {
      password_hash: newPasswordHash
    });

    logger.info('Password changed successfully', {
      targetUserId,
      isChangingOwnPassword,
      adminOverride: adminOverride || false,
      changedBy: req.user.id
    });

    res.json({
      message: isChangingOwnPassword
        ? 'Senha alterada com sucesso'
        : `Senha do usuário ${targetUserId} alterada com sucesso`,
      adminOverride: adminOverride || false
    });
  } catch (error) {
    logger.error('Failed to change password', {
      message: error.message,
      targetUserId: req.params.id || req.user?.id,
      changedBy: req.user?.id,
      stack: error.stack
    });
    const { status, message } = handleDatabaseError(error);
    res.status(status).json({
      error: message,
      timestamp: new Date().toISOString(),
      path: req.path
    });
  }
};

/**
 * POST /api/users/logout
 * Realizar logout do usuário
 */
const logout = async (req, res) => {
  try {
    logger.info('User logged out', {
      userId: req.user?.id,
      username: req.user?.username
    });

    // Logout simples - apenas retorna mensagem de sucesso
    // No lado do cliente, o token deve ser removido
    res.json({
      message: 'Logout realizado com sucesso'
    });
  } catch (error) {
    logger.error('Logout failed', {
      message: error.message,
      userId: req.user?.id,
      stack: error.stack
    });
    res.status(500).json({
      error: 'Erro ao realizar logout',
      timestamp: new Date().toISOString(),
      path: req.path
    });
  }
};

/**
 * PATCH /api/users/:id/deactivate
 * Inativar usuário (apenas admin)
 */
const deactivateUser = async (req, res) => {
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

    const userId = parseInt(id);
    const { userRepository } = getRepositories();

    // Verificar se o usuário existe
    const user = await userRepository.findOne({
      where: {
        id: userId,
        deleted_at: null
      },
      select: ['id', 'username', 'status']
    });

    if (!user) {
      return res.status(404).json({
        error: 'Usuário não encontrado',
        message: `Usuário com ID ${userId} não existe ou já foi removido`,
        timestamp: new Date().toISOString(),
        path: req.path
      });
    }

    // Verificar se o usuário já está inativo
    if (user.status === 'inactive') {
      return res.status(400).json({
        error: 'Usuário já está inativo',
        message: `O usuário ${user.username} já está com status inativo`,
        timestamp: new Date().toISOString(),
        path: req.path
      });
    }

    // Atualizar status para inactive
    await userRepository.update(userId, {
      status: 'inactive'
    });

    // Buscar usuário atualizado
    const updatedUser = await userRepository.findOne({
      where: { id: userId },
      select: ['id', 'username', 'email', 'status', 'updated_at']
    });

    logger.info('User deactivated successfully', {
      targetUserId: userId,
      deactivatedBy: req.user.id,
      username: user.username
    });

    res.json({
      message: 'Usuário inativado com sucesso',
      data: updatedUser
    });
  } catch (error) {
    logger.error('Failed to deactivate user', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      targetUserId: req.params.id,
      deactivatedBy: req.user?.id,
      stack: error.stack
    });

    const { status, message } = handleDatabaseError(error);
    res.status(status).json({
      error: message,
      timestamp: new Date().toISOString(),
      path: req.path
    });
  }
};

// ==================== EXPORTS ====================

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  register,
  login,
  refreshToken,
  getProfile,
  updateProfile,
  updateUser,
  changePassword,
  logout,
  deactivateUser,
  deleteUser
};
