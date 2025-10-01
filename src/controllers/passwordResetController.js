const pool = require('../config/database');
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
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email é obrigatório' });
    }

    // Buscar usuário por email
    const result = await pool.query(
      'SELECT id, first_name, email, status FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    // Por segurança, sempre retorna sucesso mesmo se o email não existir
    if (result.rows.length === 0) {
      return res.status(200).json({
        message: 'Se o email existir em nossa base, você receberá instruções para redefinir sua senha'
      });
    }

    const user = result.rows[0];

    // Verificar se a conta está ativa
    if (user.status !== 'active') {
      return res.status(403).json({
        error: 'Esta conta está inativa. Entre em contato com o suporte.'
      });
    }

    // Gerar token de reset
    const { token, hashedToken, expiresAt } = generatePasswordResetToken(30); // 30 minutos

    // Salvar token hasheado no banco
    await pool.query(
      'UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3',
      [hashedToken, expiresAt, user.id]
    );

    // Criar URL de reset
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

    // Enviar email
    const emailTemplate = passwordResetEmail(user.first_name, resetUrl);

    await sendEmail({
      to: user.email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text
    });

    res.status(200).json({
      message: 'Se o email existir em nossa base, você receberá instruções para redefinir sua senha',
      // Em desenvolvimento, retornar o token
      ...(process.env.NODE_ENV !== 'production' && {
        debug: {
          token,
          resetUrl,
          expiresAt
        }
      })
    });

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
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token é obrigatório' });
    }

    // Hash do token recebido para comparar com o banco
    const hashedToken = hashToken(token);

    // Buscar usuário com o token válido
    const result = await pool.query(
      `SELECT id, email FROM users
       WHERE password_reset_token = $1
       AND password_reset_expires > NOW()
       AND status = 'active'`,
      [hashedToken]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        error: 'Token inválido ou expirado. Solicite um novo reset de senha.'
      });
    }

    res.status(200).json({
      message: 'Token válido',
      email: result.rows[0].email
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
    const result = await pool.query(
      `SELECT id, email, first_name FROM users
       WHERE password_reset_token = $1
       AND password_reset_expires > NOW()
       AND status = 'active'`,
      [hashedToken]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        error: 'Token inválido ou expirado. Solicite um novo reset de senha.'
      });
    }

    const user = result.rows[0];

    // Gerar hash da nova senha
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Atualizar senha e limpar tokens de reset
    await pool.query(
      `UPDATE users
       SET password_hash = $1,
           password_reset_token = NULL,
           password_reset_expires = NULL,
           login_attempts = 0,
           locked_until = NULL
       WHERE id = $2`,
      [passwordHash, user.id]
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
