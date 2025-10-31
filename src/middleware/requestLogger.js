const logger = require('../config/logger');

/**
 * Middleware para logging de requisições HTTP
 * Registra informações sobre cada requisição recebida pela API
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Capturar informações da requisição
  const requestInfo = {
    method: req.method,
    url: req.originalUrl || req.url,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent') || 'Unknown',
    userId: req.user?.id || 'anonymous',
    contentLength: req.get('content-length') || 0
  };

  // Log da requisição inicial
  logger.http('Incoming request', requestInfo);

  // Interceptar o método res.json para capturar a resposta
  const originalJson = res.json.bind(res);
  res.json = function (body) {
    res.body = body;
    return originalJson(body);
  };

  // Interceptar o método res.send para capturar a resposta
  const originalSend = res.send.bind(res);
  res.send = function (body) {
    res.body = body;
    return originalSend(body);
  };

  // Quando a resposta for finalizada
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const responseInfo = {
      ...requestInfo,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('content-length') || 0
    };

    // Determinar o nível de log baseado no status code
    if (res.statusCode >= 500) {
      logger.error('Request completed with server error', responseInfo);
    } else if (res.statusCode >= 400) {
      logger.warn('Request completed with client error', responseInfo);
    } else {
      logger.http('Request completed successfully', responseInfo);
    }
  });

  // Capturar erros durante o processamento da requisição
  res.on('error', (error) => {
    const duration = Date.now() - startTime;
    logger.error('Request error', {
      ...requestInfo,
      duration: `${duration}ms`,
      error: error.message,
      stack: error.stack
    });
  });

  next();
};

/**
 * Middleware para logging de erros não tratados
 * Deve ser usado após todas as rotas
 */
const errorLogger = (err, req, res, next) => {
  const errorInfo = {
    method: req.method,
    url: req.originalUrl || req.url,
    ip: req.ip || req.connection.remoteAddress,
    userId: req.user?.id || 'anonymous',
    error: err.message,
    stack: err.stack,
    statusCode: err.statusCode || 500
  };

  logger.error('Unhandled error in request', errorInfo);

  next(err);
};

/**
 * Função auxiliar para logging manual em controllers
 * @param {string} level - Nível do log (info, warn, error, debug)
 * @param {string} message - Mensagem do log
 * @param {object} metadata - Metadados adicionais
 * @param {object} req - Objeto da requisição (opcional)
 */
const logAction = (level, message, metadata = {}, req = null) => {
  const logData = {
    ...metadata
  };

  // Adicionar informações da requisição se disponível
  if (req) {
    logData.method = req.method;
    logData.url = req.originalUrl || req.url;
    logData.userId = req.user?.id || 'anonymous';
    logData.ip = req.ip || req.connection.remoteAddress;
  }

  logger[level](message, logData);
};

module.exports = {
  requestLogger,
  errorLogger,
  logAction
};
