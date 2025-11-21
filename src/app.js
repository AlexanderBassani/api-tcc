const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const { doubleCsrf } = require('csrf-csrf');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const userRoutes = require('./routes/userRoutes');
const passwordResetRoutes = require('./routes/passwordReset');
const preferencesRoutes = require('./routes/preferences');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { requestLogger, errorLogger } = require('./middleware/requestLogger');
const { generalLimiter } = require('./middleware/rateLimiting');
const logger = require('./config/logger');
require('dotenv').config();

const app = express();

// Configuração de segurança com Helmet
app.use(helmet({
  // Content Security Policy - configurado para permitir Swagger UI
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Swagger precisa de inline styles
      scriptSrc: ["'self'", "'unsafe-inline'"], // Swagger precisa de inline scripts
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  // Configurações adicionais de segurança
  crossOriginEmbedderPolicy: false, // Desabilitado para compatibilidade com recursos externos
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Permite recursos cross-origin
}));

// Configuração CORS
const corsOptions = {
  origin: function (origin, callback) {
    // Permite requisições sem origin (mobile apps, Postman, etc)
    if (!origin) {
      return callback(null, true);
    }

    // Lista de origens permitidas
    const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
      ? process.env.CORS_ALLOWED_ORIGINS.split(',').map(o => o.trim())
      : ['http://localhost:3000', 'http://localhost:3001'];

    // Permite todas as origens em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }

    // Verifica se a origem está na lista de permitidas
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Permite envio de cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400 // Cache de preflight por 24 horas
};

app.use(cors(corsOptions));

// Aplicar limitador geral de rate limiting a todas as rotas
app.use(generalLimiter);

// Middleware para parsing JSON com limite de tamanho configurável
const jsonLimit = process.env.JSON_LIMIT || '10mb';
const urlEncodedLimit = process.env.URL_ENCODED_LIMIT || '10mb';

app.use(express.json({ limit: jsonLimit }));
app.use(express.urlencoded({ extended: true, limit: urlEncodedLimit }));

// Proteção contra HTTP Parameter Pollution (HPP)
// Previne ataques onde múltiplos parâmetros com o mesmo nome são enviados
// Exemplo: ?id=1&id=2&id=3 -> apenas o último valor é mantido
app.use(hpp({
  // Whitelist: parâmetros que podem ter múltiplos valores (arrays)
  // Exemplo: ?tags=node&tags=express -> ['node', 'express']
  whitelist: []
}));

// Cookie Parser - necessário para CSRF protection
app.use(cookieParser());

// Proteção CSRF (Cross-Site Request Forgery)
// Desabilitado em ambiente de testes para não quebrar os testes existentes
const csrfEnabled = process.env.NODE_ENV !== 'test';

let csrfProtection, generateToken;

if (csrfEnabled) {
  const doubleCsrfOptions = {
    getSecret: () => process.env.CSRF_SECRET || 'default-csrf-secret-change-in-production',
    cookieName: 'x-csrf-token',
    cookieOptions: {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production', // HTTPS em produção
      maxAge: 86400000 // 24 horas
    },
    size: 64,
    ignoredMethods: ['GET', 'HEAD', 'OPTIONS']
  };

  const csrf = doubleCsrf(doubleCsrfOptions);
  csrfProtection = csrf.doubleCsrfProtection;
  generateToken = csrf.generateToken;
} else {
  // Mock middleware para testes
  csrfProtection = (req, res, next) => next();
  generateToken = (req, res) => 'test-token';
}

// Middleware de logging de requisições (todas as requisições HTTP)
app.use(requestLogger);

// Rotas principais
app.get('/', (req, res) => {
  res.json({
    message: 'API funcionando!',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Swagger Documentation - Dynamic server detection
app.use('/api-docs', swaggerUi.serve);
app.get('/api-docs', (req, res, next) => {
  const protocol = req.protocol;
  const host = req.get('host');
  const currentServer = `${protocol}://${host}`;

  // Create a copy of swaggerSpec with dynamic server
  const dynamicSwaggerSpec = {
    ...swaggerSpec,
    servers: [
      {
        url: currentServer,
        description: 'Current server'
      },
      ...swaggerSpec.servers.filter(server => server.url !== currentServer)
    ]
  };

  swaggerUi.setup(dynamicSwaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'API Documentation'
  })(req, res, next);
});

// Swagger JSON endpoint
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Endpoint para obter token CSRF
app.get('/api/csrf-token', (req, res) => {
  const token = generateToken(req, res);
  res.json({
    token,
    headerName: 'x-csrf-token',
    cookieName: 'x-csrf-token'
  });
});

// Aplicar proteção CSRF nas rotas da API (POST, PUT, DELETE, PATCH)
// GET, HEAD e OPTIONS são ignorados automaticamente
app.use('/api', csrfProtection);

// Rotas da API
app.use('/api', userRoutes);
app.use('/api/password-reset', passwordResetRoutes);
app.use('/api/preferences', preferencesRoutes);

// Middleware para rotas não encontradas
app.use(notFoundHandler);

// Middleware de logging de erros (antes do errorHandler)
app.use(errorLogger);

// Middleware global de tratamento de erros (deve ser o último)
app.use(errorHandler);

module.exports = app;