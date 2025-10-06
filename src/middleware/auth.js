const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        error: 'Token de autenticação não fornecido'
      });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({
          error: 'Token inválido ou expirado'
        });
      }

      req.user = user;
      next();
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Erro ao verificar autenticação'
    });
  }
};

const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      req.user = null;
      return next();
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        req.user = null;
      } else {
        req.user = user;
      }
      next();
    });
  } catch (error) {
    req.user = null;
    next();
  }
};

/**
 * Middleware para autorização baseada em roles
 * @param {...string} allowedRoles - Roles permitidas (ex: 'admin', 'user')
 * @returns {Function} Middleware function
 *
 * @example
 * // Permitir apenas admin
 * router.delete('/users/:id', authenticateToken, authorizeRoles('admin'), deleteUser);
 *
 * // Permitir admin e moderator
 * router.post('/posts', authenticateToken, authorizeRoles('admin', 'moderator'), createPost);
 */
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      // Verificar se o usuário está autenticado
      if (!req.user) {
        return res.status(401).json({
          error: 'Autenticação necessária',
          message: 'Você precisa estar autenticado para acessar este recurso',
          timestamp: new Date().toISOString(),
          path: req.path
        });
      }

      // Verificar se o usuário tem role
      if (!req.user.role) {
        return res.status(403).json({
          error: 'Acesso negado',
          message: 'Seu usuário não possui permissões definidas',
          timestamp: new Date().toISOString(),
          path: req.path
        });
      }

      // Verificar se a role do usuário está entre as permitidas
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          error: 'Acesso negado',
          message: `Esta ação requer uma das seguintes permissões: ${allowedRoles.join(', ')}`,
          required_roles: allowedRoles,
          user_role: req.user.role,
          timestamp: new Date().toISOString(),
          path: req.path
        });
      }

      // Usuário autorizado
      next();
    } catch (error) {
      console.error('Erro ao verificar autorização:', error);
      return res.status(500).json({
        error: 'Erro ao verificar autorização',
        timestamp: new Date().toISOString(),
        path: req.path
      });
    }
  };
};

module.exports = {
  authenticateToken,
  optionalAuth,
  authorizeRoles
};