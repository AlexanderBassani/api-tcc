const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const userRoutes = require('./routes/userRoutes');
const passwordResetRoutes = require('./routes/passwordReset');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
require('dotenv').config();

const app = express();

// Middleware para parsing JSON com limite de tamanho
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware para logging de requisições em desenvolvimento
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

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

// Rotas da API
app.use('/api', userRoutes);
app.use('/api/password-reset', passwordResetRoutes);

// Middleware para rotas não encontradas
app.use(notFoundHandler);

// Middleware global de tratamento de erros (deve ser o último)
app.use(errorHandler);

module.exports = app;