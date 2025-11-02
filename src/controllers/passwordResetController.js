const { getUserRepository } = require('../utils/repositories');
const { MoreThan } = require('typeorm');
const bcrypt = require('bcrypt');
const { generatePasswordResetToken, hashToken } = require('../utils/tokenGenerator');
const { sendEmail } = require('../config/email');
const passwordResetEmail = require('../templates/passwordResetEmail');

/**
 * Solicita reset de senha
 * POST /api/password-reset/request
 */
const requestPasswordReset = async (req, res) => {
  try {
    const userRepo = getUserRepository();
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email é obrigatório' });
    }

    // Buscar usuário por email
    const user = await userRepo.findOne({
      where: { email: email.toLowerCase() },
      select: ['id', 'firstName', 'email', 'status']
    });

    // Por segurança, sempre retorna sucesso mesmo se o email não existir
    if (!user) {
      return res.status(200).json({
        message: 'Se o email existir em nossa base, você receberá instruções para redefinir sua senha'
      });
    }

    // Verificar se a conta está ativa
    if (user.status !== 'active') {
      return res.status(403).json({
        error: 'Esta conta está inativa. Entre em contato com o suporte.'
      });
    }

    // Gerar token de reset
    const { token, hashedToken, expiresAt } = generatePasswordResetToken(30); // 30 minutos

    // Salvar token hasheado no banco
    await userRepo.update(
      { id: user.id },
      {
        passwordResetToken: hashedToken,
        passwordResetExpires: expiresAt
      }
    );

    // Criar URL de reset
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

    // Enviar email
    const emailTemplate = passwordResetEmail(user.firstName, resetUrl);

    await sendEmail({
      to: user.email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text
    });

    // IMPORTANTE: Garantir que estamos retornando o token ORIGINAL
    const responseObj = {
      message: 'Se o email existir em nossa base, você receberá instruções para redefinir sua senha'
    };

    if (process.env.NODE_ENV !== 'production') {
      responseObj.debug = {
        token: token, // Token ORIGINAL (não hasheado)
        tokenType: 'ORIGINAL_TOKEN',
        resetUrl,
        expiresAt
      };
    }

    res.status(200).json(responseObj);

  } catch (error) {
    console.error('Erro ao solicitar reset de senha:', error);
    res.status(500).json({ error: 'Erro ao processar solicitação' });
  }
};

/**
 * Valida token de reset de senha
 * POST /api/password-reset/validate-token
 */
const validateResetToken = async (req, res) => {
  try {
    const userRepo = getUserRepository();
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token é obrigatório' });
    }

    // Hash do token recebido para comparar com o banco
    const hashedToken = hashToken(token);

    // Buscar usuário com o token válido
    const user = await userRepo.findOne({
      where: {
        passwordResetToken: hashedToken,
        passwordResetExpires: MoreThan(new Date()),
        status: 'active'
      },
      select: ['id', 'email', 'passwordResetToken', 'passwordResetExpires', 'status']
    });

    if (!user) {
      return res.status(400).json({
        error: 'Token inválido ou expirado. Solicite um novo reset de senha.'
      });
    }

    res.status(200).json({
      message: 'Token válido',
      email: user.email
    });

  } catch (error) {
    console.error('Erro ao validar token:', error);
    res.status(500).json({ error: 'Erro ao validar token' });
  }
};

/**
 * Redefine a senha do usuário
 * POST /api/password-reset/reset
 */
const resetPassword = async (req, res) => {
  try {
    const userRepo = getUserRepository();
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        error: 'Token e nova senha são obrigatórios'
      });
    }

    // Validar senha
    if (newPassword.length < 8) {
      return res.status(400).json({
        error: 'A senha deve ter no mínimo 8 caracteres'
      });
    }

    // Hash do token recebido
    const hashedToken = hashToken(token);

    // Buscar usuário com token válido
    const user = await userRepo.findOne({
      where: {
        passwordResetToken: hashedToken,
        passwordResetExpires: MoreThan(new Date()),
        status: 'active'
      },
      select: ['id', 'email', 'firstName']
    });

    if (!user) {
      return res.status(400).json({
        error: 'Token inválido ou expirado. Solicite um novo reset de senha.'
      });
    }

    // Gerar hash da nova senha
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Atualizar senha e limpar tokens de reset
    await userRepo.update(
      { id: user.id },
      {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
        loginAttempts: 0,
        lockedUntil: null
      }
    );

    res.status(200).json({
      message: 'Senha redefinida com sucesso! Você já pode fazer login com sua nova senha.'
    });

  } catch (error) {
    console.error('Erro ao redefinir senha:', error);
    res.status(500).json({ error: 'Erro ao redefinir senha' });
  }
};

module.exports = {
  requestPasswordReset,
  validateResetToken,
  resetPassword
};
