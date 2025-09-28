// Middleware global de tratamento de erros
const errorHandler = (err, req, res, next) => {
  console.error('Erro não tratado:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.url,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
    headers: req.headers,
    timestamp: new Date().toISOString()
  });

  // Erro de validação do Express
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'JSON inválido',
      message: 'O corpo da requisição contém JSON malformado',
      timestamp: new Date().toISOString(),
      path: req.path
    });
  }

  // Erro de payload muito grande
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      error: 'Payload muito grande',
      message: 'O tamanho da requisição excede o limite permitido',
      timestamp: new Date().toISOString(),
      path: req.path
    });
  }

  // Erro de timeout
  if (err.code === 'ETIMEDOUT') {
    return res.status(504).json({
      error: 'Timeout',
      message: 'A requisição demorou muito para ser processada',
      timestamp: new Date().toISOString(),
      path: req.path
    });
  }

  // Erro padrão
  res.status(err.status || 500).json({
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development'
      ? err.message
      : 'Ocorreu um erro inesperado. Tente novamente mais tarde.',
    timestamp: new Date().toISOString(),
    path: req.path
  });
};

// Middleware para capturar rotas não encontradas
const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: 'Rota não encontrada',
    message: `A rota ${req.method} ${req.path} não existe`,
    available_routes: [
      'GET /',
      'GET /health',
      'GET /api/users',
      'GET /api/users/:id',
      'POST /api/users'
    ],
    timestamp: new Date().toISOString(),
    path: req.path
  });
};

module.exports = {
  errorHandler,
  notFoundHandler
};