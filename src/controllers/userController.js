const { getUserRepository, getUserPreferencesRepository } = require('../utils/repositories');
const {  IsNull, Not } = require('typeorm');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

// Helper: Criar preferências padrão para um usuário
const createDefaultPreferences = async (userId) => {
  try {
    const preferencesRepo = getUserPreferencesRepository();

    const preferences = preferencesRepo.create({
      userId,
      themeMode: 'system',
      themeColor: 'blue',
      fontSize: 'medium',
      compactMode: false,
      animationsEnabled: true,
      highContrast: false,
      reduceMotion: false
    });

    await preferencesRepo.save(preferences);

    logger.info('Default preferences created', { userId });
  } catch (error) {
    logger.error('Failed to create default preferences', {
      userId,
      error: error.message
    });
    throw error;
  }
};

// Helper: Gerar token JWT
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role
    },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

// Helper: Gerar refresh token
const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
};

// Helper: Lidar com erros de banco de dados
const handleDatabaseError = (error) => {
  if (error.code === '23505') { // Unique violation
    if (error.detail?.includes('email')) {
      return { status: 409, message: 'Email já está em uso' };
    }
    if (error.detail?.includes('username')) {
      return { status: 409, message: 'Username já está em uso' };
    }
    return { status: 409, message: 'Registro duplicado' };
  }

  if (error.code === '23503') { // Foreign key violation
    return { status: 400, message: 'Referência inválida' };
  }

  return { status: 500, message: 'Erro interno do servidor' };
};

/**
 * @desc    Get all users
 * @route   GET /api/users
 * @access  Private
 */
const getAllUsers = async (req, res) => {
  try {
    const userRepo = getUserRepository();

    const users = await userRepo.find({
      where: { deletedAt: IsNull() },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        email: true,
        role: true,
        status: true,
        emailVerified: true,
        phoneVerified: true,
        createdAt: true,
        lastLoginAt: true
      },
      order: { createdAt: 'DESC' }
    });

    logger.info('Users list retrieved', {
      count: users.length,
      requestedBy: req.user.id
    });

    res.json(users);
  } catch (error) {
    logger.error('Failed to get users', {
      error: error.message,
      requestedBy: req.user?.id
    });

    res.status(500).json({
      error: 'Erro ao buscar usuários',
      timestamp: new Date().toISOString(),
      path: req.path
    });
  }
};

/**
 * @desc    Get user by ID
 * @route   GET /api/users/:id
 * @access  Private
 */
const getUserById = async (req, res) => {
  try {
    const userRepo = getUserRepository();
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        error: 'ID inválido',
        message: 'O ID deve ser um número válido',
        timestamp: new Date().toISOString(),
        path: req.path
      });
    }

    const user = await userRepo.findOne({
      where: {
        id: parseInt(id),
        deletedAt: IsNull()
      },
      select: {
        passwordHash: false
      }
    });

    if (!user) {
      logger.warn('User not found', { userId: id, requestedBy: req.user.id });
      return res.status(404).json({
        error: 'Usuário não encontrado',
        timestamp: new Date().toISOString(),
        path: req.path
      });
    }

    logger.info('User retrieved', { userId: id, requestedBy: req.user.id });
    res.json(user);
  } catch (error) {
    logger.error('Failed to get user', {
      userId: req.params.id,
      error: error.message,
      requestedBy: req.user?.id
    });

    res.status(500).json({
      error: 'Erro ao buscar usuário',
      timestamp: new Date().toISOString(),
      path: req.path
    });
  }
};

/**
 * @desc    Create new user (admin only)
 * @route   POST /api/users
 * @access  Private (Admin)
 */
const createUser = async (req, res) => {
  try {
    const userRepo = getUserRepository();
    const {
      first_name,
      last_name,
      username,
      email,
      password,
      role = 'user'
    } = req.body;

    // Validações
    if (!first_name || !last_name || !username || !email || !password) {
      return res.status(400).json({
        error: 'Dados incompletos',
        message: 'Todos os campos obrigatórios devem ser preenchidos',
        required: ['first_name', 'last_name', 'username', 'email', 'password'],
        timestamp: new Date().toISOString()
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'Senha muito curta',
        message: 'A senha deve ter pelo menos 6 caracteres'
      });
    }

    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({
        error: 'Role inválido',
        message: 'Role deve ser "admin" ou "user"'
      });
    }

    // Hash da senha
    const passwordHash = await bcrypt.hash(password, 10);

    // Criar usuário
    const newUser = userRepo.create({
      firstName: first_name,
      lastName: last_name,
      username,
      email: email.toLowerCase(),
      passwordHash,
      role,
      status: 'active',
      emailVerified: false
    });

    const savedUser = await userRepo.save(newUser);

    // Criar preferências padrão
    await createDefaultPreferences(savedUser.id);

    logger.info('User created by admin', {
      newUserId: savedUser.id,
      createdBy: req.user.id,
      role: savedUser.role
    });

    // Remover senha do response
    const { passwordHash: _, ...userResponse } = savedUser;

    res.status(201).json({
      message: 'Usuário criado com sucesso',
      user: userResponse
    });

  } catch (error) {
    logger.error('Failed to create user', {
      error: error.message,
      code: error.code,
      createdBy: req.user?.id
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
 * @desc    Register new user
 * @route   POST /api/users/register
 * @access  Public
 */
const register = async (req, res) => {
  try {
    const userRepo = getUserRepository();
    const {
      first_name,
      last_name,
      username,
      email,
      password
    } = req.body;

    // Validações
    if (!first_name || !last_name || !username || !email || !password) {
      return res.status(400).json({
        error: 'Dados incompletos',
        message: 'Todos os campos são obrigatórios',
        required: ['first_name', 'last_name', 'username', 'email', 'password']
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'Senha muito curta',
        message: 'A senha deve ter pelo menos 6 caracteres'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Email inválido',
        message: 'Formato de email inválido'
      });
    }

    // Verificar duplicados
    const existing = await userRepo.findOne({
      where: [
        { email: email.toLowerCase() },
        { username }
      ]
    });

    if (existing) {
      const field = existing.email === email.toLowerCase() ? 'email' : 'username';
      return res.status(409).json({
        error: `${field.charAt(0).toUpperCase() + field.slice(1)} já está em uso`,
        field
      });
    }

    // Hash da senha
    const passwordHash = await bcrypt.hash(password, 10);

    // Criar usuário
    const newUser = userRepo.create({
      firstName: first_name,
      lastName: last_name,
      username,
      email: email.toLowerCase(),
      passwordHash,
      role: 'user',
      status: 'active',
      emailVerified: false
    });

    const savedUser = await userRepo.save(newUser);

    // Criar preferências padrão
    await createDefaultPreferences(savedUser.id);

    // Gerar tokens
    const token = generateToken(savedUser);
    const refreshToken = generateRefreshToken(savedUser);

    logger.info('User registered', { userId: savedUser.id, username: savedUser.username });

    res.status(201).json({
      message: 'Usuário registrado com sucesso',
      token,
      refreshToken,
      user: {
        id: savedUser.id,
        firstName: savedUser.firstName,
        lastName: savedUser.lastName,
        username: savedUser.username,
        email: savedUser.email,
        role: savedUser.role
      }
    });

  } catch (error) {
    logger.error('Registration failed', {
      error: error.message,
      code: error.code
    });

    const { status, message } = handleDatabaseError(error);
    res.status(status).json({ error: message });
  }
};

/**
 * @desc    Login user
 * @route   POST /api/users/login
 * @access  Public
 */
const login = async (req, res) => {
  try {
    const userRepo = getUserRepository();
    const { login, password } = req.body;

    if (!login || !password) {
      return res.status(400).json({
        error: 'Login e senha são obrigatórios',
        timestamp: new Date().toISOString(),
        path: req.path
      });
    }

    // Buscar usuário por username ou email
    const user = await userRepo.createQueryBuilder('user')
      .where('(user.username = :login OR user.email = :login)', { login })
      .andWhere('user.deletedAt IS NULL')
      .select([
        'user.id',
        'user.firstName',
        'user.lastName',
        'user.username',
        'user.email',
        'user.passwordHash',
        'user.role',
        'user.status',
        'user.emailVerified',
        'user.loginAttempts',
        'user.lockedUntil'
      ])
      .getOne();

    if (!user) {
      return res.status(401).json({
        error: 'Credenciais inválidas',
        timestamp: new Date().toISOString(),
        path: req.path
      });
    }

    // Verificar se a conta está bloqueada
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
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
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatch) {
      // Incrementar tentativas de login
      const newAttempts = user.loginAttempts + 1;
      const updateData = { loginAttempts: newAttempts };

      // Bloquear conta após 5 tentativas
      if (newAttempts >= 5) {
        const lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos
        updateData.lockedUntil = lockUntil;
      }

      await userRepo.update({ id: user.id }, updateData);

      return res.status(401).json({
        error: 'Credenciais inválidas',
        timestamp: new Date().toISOString(),
        path: req.path
      });
    }

    // Resetar tentativas de login e atualizar último login
    await userRepo.update(
      { id: user.id },
      {
        loginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date()
      }
    );

    // Remover dados sensíveis
    delete user.passwordHash;
    delete user.loginAttempts;
    delete user.lockedUntil;

    const token = generateToken(user);
    const refreshTokenValue = generateRefreshToken(user);

    logger.info('User logged in successfully', {
      userId: user.id,
      username: user.username,
      email: user.email
    });

    res.json({
      message: 'Login realizado com sucesso',
      user,
      token,
      refreshToken: refreshTokenValue
    });
  } catch (error) {
    logger.error('Login failed', {
      message: error.message,
      login: req.body.login,
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
 * @desc    Refresh token
 * @route   POST /api/users/refresh-token
 * @access  Public
 */
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token é obrigatório' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key');
    const userRepo = getUserRepository();

    const user = await userRepo.findOne({
      where: { id: decoded.id, deletedAt: IsNull() },
      select: ['id', 'email', 'username', 'role']
    });

    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    const newToken = generateToken(user);
    const newRefreshToken = generateRefreshToken(user);

    res.json({
      token: newToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

/**
 * @desc    Get user profile
 * @route   GET /api/users/profile
 * @access  Private
 */
const getProfile = async (req, res) => {
  try {
    const userRepo = getUserRepository();

    const user = await userRepo.findOne({
      where: { id: req.user.id, deletedAt: IsNull() },
      select: {
        passwordHash: false,
        passwordResetToken: false,
        passwordResetExpires: false,
        emailVerificationToken: false,
        emailVerificationExpires: false
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json(user);
  } catch (error) {
    logger.error('Failed to get profile', {
      userId: req.user?.id,
      error: error.message
    });
    res.status(500).json({ error: 'Erro ao buscar perfil' });
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/users/profile
 * @access  Private
 */
const updateProfile = async (req, res) => {
  try {
    const userRepo = getUserRepository();
    const userId = req.user.id;

    const allowedFields = [
      'firstName', 'lastName', 'phone', 'dateOfBirth', 'gender', 'bio',
      'profileImageUrl', 'preferredLanguage', 'timezone', 'marketingEmailsConsent'
    ];

    const updates = {};
    Object.keys(req.body).forEach(key => {
      const snakeToCamel = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      if (allowedFields.includes(snakeToCamel)) {
        updates[snakeToCamel] = req.body[key];
      }
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Nenhum campo válido para atualizar' });
    }

    await userRepo.update({ id: userId }, updates);

    const updatedUser = await userRepo.findOne({
      where: { id: userId },
      select: { passwordHash: false }
    });

    logger.info('Profile updated', { userId });

    res.json({
      message: 'Perfil atualizado com sucesso',
      user: updatedUser
    });
  } catch (error) {
    logger.error('Failed to update profile', {
      userId: req.user?.id,
      error: error.message
    });
    const { status, message } = handleDatabaseError(error);
    res.status(status).json({ error: message });
  }
};

/**
 * @desc    Change password
 * @route   PUT /api/users/change-password
 * @access  Private
 */
const changePassword = async (req, res) => {
  try {
    const userRepo = getUserRepository();
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Senha atual e nova senha são obrigatórias'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: 'A nova senha deve ter pelo menos 6 caracteres'
      });
    }

    const user = await userRepo.findOne({
      where: { id: req.user.id },
      select: ['id', 'passwordHash']
    });

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Senha atual incorreta' });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await userRepo.update({ id: user.id }, { passwordHash: newPasswordHash });

    logger.info('Password changed', { userId: user.id });

    res.json({ message: 'Senha alterada com sucesso' });
  } catch (error) {
    logger.error('Failed to change password', {
      userId: req.user?.id,
      error: error.message
    });
    res.status(500).json({ error: 'Erro ao alterar senha' });
  }
};

/**
 * @desc    Logout user
 * @route   POST /api/users/logout
 * @access  Private
 */
const logout = async (req, res) => {
  logger.info('User logged out', { userId: req.user.id });
  res.json({ message: 'Logout realizado com sucesso' });
};

/**
 * @desc    Deactivate user (admin)
 * @route   PATCH /api/users/:id/deactivate
 * @access  Private (Admin)
 */
const deactivateUser = async (req, res) => {
  try {
    const userRepo = getUserRepository();
    const { id } = req.params;

    const result = await userRepo.update(
      { id: parseInt(id), deletedAt: IsNull() },
      { status: 'inactive' }
    );

    if (result.affected === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    logger.info('User deactivated', { userId: id, deactivatedBy: req.user.id });

    res.json({ message: 'Usuário inativado com sucesso' });
  } catch (error) {
    logger.error('Failed to deactivate user', {
      userId: req.params.id,
      error: error.message
    });
    res.status(500).json({ error: 'Erro ao inativar usuário' });
  }
};

/**
 * @desc    Update user (admin)
 * @route   PUT /api/users/:id
 * @access  Private (Admin)
 */
const updateUser = async (req, res) => {
  try {
    const userRepo = getUserRepository();
    const { id } = req.params;

    const allowedFields = [
      'firstName', 'lastName', 'username', 'email', 'role', 'phone',
      'dateOfBirth', 'gender', 'bio', 'profileImageUrl', 'status',
      'preferredLanguage', 'timezone', 'marketingEmailsConsent'
    ];

    const updates = {};
    Object.keys(req.body).forEach(key => {
      const snakeToCamel = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      if (allowedFields.includes(snakeToCamel)) {
        updates[snakeToCamel] = req.body[key];
      }
    });

    if (req.body.password) {
      updates.passwordHash = await bcrypt.hash(req.body.password, 10);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Nenhum campo válido para atualizar' });
    }

    await userRepo.update({ id: parseInt(id) }, updates);

    const updatedUser = await userRepo.findOne({
      where: { id: parseInt(id) },
      select: { passwordHash: false }
    });

    logger.info('User updated by admin', {
      userId: id,
      updatedBy: req.user.id
    });

    res.json({
      message: 'Usuário atualizado com sucesso',
      user: updatedUser
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
 * @desc    Delete user
 * @route   DELETE /api/users/:id
 * @access  Private (Admin)
 */
const deleteUser = async (req, res) => {
  try {
    const userRepo = getUserRepository();
    const { id } = req.params;
    const { hardDelete } = req.query;

    if (hardDelete === 'true') {
      const result = await userRepo.delete({ id: parseInt(id) });

      if (result.affected === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      logger.info('User hard deleted', {
        userId: id,
        deletedBy: req.user.id
      });

      res.json({ message: 'Usuário excluído permanentemente' });
    } else {
      const result = await userRepo.softDelete({ id: parseInt(id) });

      if (result.affected === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      logger.info('User soft deleted', {
        userId: id,
        deletedBy: req.user.id
      });

      res.json({ message: 'Usuário excluído com sucesso' });
    }
  } catch (error) {
    logger.error('Failed to delete user', {
      userId: req.params.id,
      error: error.message
    });
    res.status(500).json({ error: 'Erro ao excluir usuário' });
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
  changePassword,
  logout,
  deactivateUser,
  updateUser,
  deleteUser
};
