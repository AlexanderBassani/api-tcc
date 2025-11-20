const rateLimit = require('express-rate-limit');
const logger = require('../config/logger');

// Limitador geral para todas as rotas
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // Máximo de requisições por janela
  message: {
    error: 'Muitas requisições deste IP, por favor tente novamente mais tarde.',
    retryAfter: 'Tente novamente após o tempo especificado no header Retry-After'
  },
  standardHeaders: true, // Retorna informações de rate limit nos headers `RateLimit-*`
  legacyHeaders: false, // Desabilita headers `X-RateLimit-*`
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method
    });
    res.status(429).json({
      error: 'Muitas requisições deste IP, por favor tente novamente mais tarde.',
      retryAfter: res.getHeader('Retry-After')
    });
  }
});

// Limitador específico para rotas de autenticação (mais restritivo)
const authLimiter = rateLimit({
  windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS) || 5, // Máximo de 5 tentativas
  message: {
    error: 'Muitas tentativas de autenticação. Por favor, tente novamente mais tarde.',
    retryAfter: 'Tente novamente após o tempo especificado no header Retry-After'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Não conta requisições bem-sucedidas
  handler: (req, res) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method
    });
    res.status(429).json({
      error: 'Muitas tentativas de autenticação. Por favor, tente novamente mais tarde.',
      retryAfter: res.getHeader('Retry-After')
    });
  }
});

// Limitador para reset de senha (muito restritivo)
const passwordResetLimiter = rateLimit({
  windowMs: parseInt(process.env.PASSWORD_RESET_RATE_LIMIT_WINDOW_MS) || 60 * 60 * 1000, // 1 hora
  max: parseInt(process.env.PASSWORD_RESET_RATE_LIMIT_MAX_REQUESTS) || 3, // Máximo de 3 tentativas por hora
  message: {
    error: 'Muitas solicitações de reset de senha. Por favor, tente novamente mais tarde.',
    retryAfter: 'Tente novamente após o tempo especificado no header Retry-After'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Password reset rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method
    });
    res.status(429).json({
      error: 'Muitas solicitações de reset de senha. Por favor, tente novamente mais tarde.',
      retryAfter: res.getHeader('Retry-After')
    });
  }
});

module.exports = {
  generalLimiter,
  authLimiter,
  passwordResetLimiter
};
