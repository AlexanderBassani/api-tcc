const crypto = require('crypto');

/**
 * Gera um token aleatório seguro
 * @param {number} length - Tamanho do token em bytes (padrão: 32)
 * @returns {string} Token hexadecimal
 */
const generateToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Gera hash de um token para armazenamento seguro
 * @param {string} token - Token a ser hasheado
 * @returns {string} Hash do token
 */
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Gera token de reset de senha e sua expiração
 * @param {number} expiresInMinutes - Tempo de expiração em minutos (padrão: 30)
 * @returns {object} Objeto com token e data de expiração
 */
const generatePasswordResetToken = (expiresInMinutes = 30) => {
  const token = generateToken();
  const hashedToken = hashToken(token);
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  return {
    token, // Token original (enviar por email)
    hashedToken, // Hash do token (salvar no banco)
    expiresAt // Data de expiração
  };
};

module.exports = {
  generateToken,
  hashToken,
  generatePasswordResetToken
};
