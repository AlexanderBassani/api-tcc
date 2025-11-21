# Claude Code - Comandos e Configurações

Este arquivo contém informações importantes para o Claude Code sobre este projeto.

## Comandos de Desenvolvimento

### Iniciar o servidor
```bash
npm run dev
```

### Executar testes
```bash
npm test
```

### Executar testes em modo watch
```bash
npm run test:watch
```

### Inicializar banco de dados
```bash
npm run init-db
```

### Produção
```bash
npm start
```

### Docker
```bash
npm run docker:up         # Iniciar todos os serviços
npm run docker:down       # Parar serviços
npm run docker:init-db    # Inicializar banco
npm run docker:logs       # Ver logs
npm run docker:dev        # Desenvolvimento com rebuild
```

## Estrutura do Projeto

- `src/` - Código fonte da aplicação
  - `app.js` - Configuração do Express
  - `server.js` - Inicialização do servidor
  - `config/` - Configurações (database, initDb, swagger, logger)
  - `controllers/` - Controladores das rotas
    - `userController.js` - CRUD de usuários e autenticação
    - `passwordResetController.js` - Reset de senha
    - `preferencesController.js` - Preferências de usuário
  - `routes/` - Definição das rotas
    - `userRoutes.js` - Rotas de usuários
    - `passwordReset.js` - Rotas de reset de senha
    - `preferences.js` - Rotas de preferências
  - `middleware/` - Middlewares
    - `auth.js` - Autenticação JWT e autorização RBAC
    - `errorHandler.js` - Tratamento de erros
    - `rateLimiting.js` - Rate limiting por rota
    - `requestLogger.js` - Logging de requisições HTTP
    - `validation.js` - Validação e sanitização de dados
  - `templates/` - Templates de email
  - `utils/` - Utilitários
- `__tests__/` - Testes Jest
  - `helpers/` - Funções auxiliares para testes
    - `testUtils.js` - Helpers para gerar dados únicos de teste
  - `*.test.js` - Arquivos de teste
- `scripts/` - Scripts utilitários
  - `init-db.js` - Inicialização do banco
  - `migrate.js` - Sistema de migrations
- `migrations/` - Arquivos SQL de migrations
- `logs/` - Arquivos de log gerados pelo winston (gitignored)

## Tecnologias Utilizadas

- **Node.js** - Runtime JavaScript
- **Express** - Framework web
- **PostgreSQL** - Banco de dados
- **Jest** - Framework de testes
- **Supertest** - Testes de API
- **dotenv** - Gerenciamento de variáveis de ambiente
- **pg** - Driver PostgreSQL para Node.js
- **cors** - Middleware para Cross-Origin Resource Sharing
- **jsonwebtoken** - Autenticação JWT
- **bcryptjs** - Hash de senhas
- **nodemailer** - Envio de emails
- **swagger** - Documentação da API
- **winston** - Sistema de logging profissional
- **winston-daily-rotate-file** - Rotação automática de arquivos de log
- **helmet** - Middleware de segurança HTTP headers
- **express-rate-limit** - Rate limiting para proteção contra abusos
- **express-validator** - Validação e sanitização de dados de entrada
- **hpp** - Proteção contra HTTP Parameter Pollution

## Configuração do Banco

O projeto usa PostgreSQL com as seguintes configurações padrão no `.env`:
- Host: localhost
- Porta: 5432
- Banco: api_db
- Usuário: postgres
- Senha: password

## Configuração CORS

O sistema possui configuração CORS flexível:
- **Desenvolvimento**: Permite todas as origens por padrão
- **Produção**: Restringe às origens configuradas em `CORS_ALLOWED_ORIGINS`
- **Credenciais**: Suporta cookies e headers de autenticação
- **Métodos**: GET, POST, PUT, DELETE, PATCH, OPTIONS
- **Headers**: Content-Type, Authorization, X-Requested-With
- **Cache Preflight**: 24 horas

Configuração no `.env`:
```bash
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000,http://localhost:3001
```

## Configuração de Limites de Requisição

O sistema permite configurar limites de tamanho para requisições:

Configuração no `.env`:
```bash
# Limites de tamanho do body
JSON_LIMIT=10mb              # Limite para parsing JSON
URL_ENCODED_LIMIT=10mb       # Limite para dados URL-encoded
```

Valores padrão (se não configurados):
- JSON: 10mb
- URL-encoded: 10mb

## Segurança com Helmet

O projeto utiliza **Helmet** para proteger a aplicação configurando headers HTTP de segurança.

### Headers de Segurança Configurados

Helmet adiciona automaticamente os seguintes headers de segurança:

- **X-DNS-Prefetch-Control**: Controla o DNS prefetching dos navegadores
- **X-Frame-Options**: Previne clickjacking (SAMEORIGIN)
- **X-Content-Type-Options**: Previne MIME type sniffing (nosniff)
- **X-Download-Options**: Para navegadores IE, previne downloads não seguros (noopen)
- **X-Permitted-Cross-Domain-Policies**: Restringe políticas cross-domain (none)
- **Referrer-Policy**: Controla informações de referrer (no-referrer)
- **Strict-Transport-Security**: Força HTTPS (quando em produção)
- **X-XSS-Protection**: Proteção contra XSS (legacy browsers)

### Content Security Policy (CSP)

A aplicação possui CSP configurada com permissões específicas para o Swagger UI:

```javascript
contentSecurityPolicy: {
  directives: {
    defaultSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],   // Swagger necessita
    scriptSrc: ["'self'", "'unsafe-inline'"],  // Swagger necessita
    imgSrc: ["'self'", "data:", "https:"],
  },
}
```

### Configurações Adicionais

- **crossOriginEmbedderPolicy**: Desabilitado para compatibilidade com recursos externos
- **crossOriginResourcePolicy**: Configurado como "cross-origin" para permitir recursos de diferentes origens

### Benefícios de Segurança

✅ Proteção contra clickjacking
✅ Proteção contra XSS (Cross-Site Scripting)
✅ Prevenção de MIME type sniffing
✅ Controle de políticas cross-domain
✅ Força uso de HTTPS em produção
✅ Controle de informações de referrer

## Rate Limiting

O projeto utiliza **express-rate-limit** para proteger a API contra abusos e ataques de força bruta.

### Limitadores Configurados

#### 1. Limitador Geral (Global)
Aplicado a todas as rotas da API:
- **Janela de tempo**: 15 minutos (900.000ms)
- **Máximo de requisições**: 100 requisições por IP
- **Resposta**: HTTP 429 (Too Many Requests)

#### 2. Limitador de Autenticação
Aplicado às rotas de login e registro:
- **Janela de tempo**: 15 minutos
- **Máximo de requisições**: 5 tentativas por IP
- **Característica especial**: Não conta requisições bem-sucedidas (skipSuccessfulRequests)
- **Rotas protegidas**:
  - `POST /api/users/login`
  - `POST /api/users/register`

#### 3. Limitador de Reset de Senha
Aplicado às rotas de recuperação de senha:
- **Janela de tempo**: 1 hora (3.600.000ms)
- **Máximo de requisições**: 3 tentativas por IP
- **Rotas protegidas**:
  - `POST /api/password-reset/request`
  - `POST /api/password-reset/validate-token`
  - `POST /api/password-reset/reset`

### Configuração no `.env`

```bash
# Limitador Geral
RATE_LIMIT_WINDOW_MS=900000              # 15 minutos
RATE_LIMIT_MAX_REQUESTS=100              # 100 requisições

# Limitador de Autenticação
AUTH_RATE_LIMIT_WINDOW_MS=900000         # 15 minutos
AUTH_RATE_LIMIT_MAX_REQUESTS=5           # 5 tentativas

# Limitador de Reset de Senha
PASSWORD_RESET_RATE_LIMIT_WINDOW_MS=3600000  # 1 hora
PASSWORD_RESET_RATE_LIMIT_MAX_REQUESTS=3     # 3 tentativas
```

### Headers de Resposta

Quando o rate limiting está ativo, a API retorna os seguintes headers:

- `RateLimit-Limit`: Número máximo de requisições permitidas
- `RateLimit-Remaining`: Número de requisições restantes na janela atual
- `RateLimit-Reset`: Timestamp quando o limite será resetado
- `Retry-After`: Tempo em segundos até poder tentar novamente (quando limite excedido)

### Resposta ao Exceder Limite

```json
{
  "error": "Muitas requisições deste IP, por favor tente novamente mais tarde.",
  "retryAfter": "900"
}
```

### Benefícios de Segurança

✅ Proteção contra ataques de força bruta em login
✅ Prevenção de abuso de recursos da API
✅ Proteção contra ataques DDoS básicos
✅ Limitação de tentativas de reset de senha
✅ Logs automáticos de violações de rate limit

## Proteção HTTP Parameter Pollution (HPP)

O projeto utiliza **hpp** para proteger contra ataques de poluição de parâmetros HTTP.

### O que é HPP?

HTTP Parameter Pollution (HPP) é um ataque onde um atacante envia múltiplos parâmetros HTTP com o mesmo nome para explorar vulnerabilidades na forma como a aplicação processa esses parâmetros.

**Exemplo de ataque:**
```
GET /api/users?id=1&id=2&id=3
```

Sem proteção, diferentes frameworks tratam isso de formas diferentes:
- Alguns usam o primeiro valor (id=1)
- Outros usam o último valor (id=3)
- Outros criam um array ([1, 2, 3])

Isso pode levar a:
- Bypass de validações
- Acesso não autorizado
- Manipulação de dados
- Comportamento inesperado

### Como o HPP Protege

O middleware HPP:
1. **Remove parâmetros duplicados** - Mantém apenas o último valor
2. **Protege query strings, body e params**
3. **Suporta whitelist** - Permite arrays em parâmetros específicos
4. **Previne ataques de pollution** - Garante comportamento consistente

### Configuração

```javascript
const hpp = require('hpp');

app.use(hpp({
  // Whitelist: parâmetros que podem ter múltiplos valores (arrays)
  // Exemplo: ?tags=node&tags=express -> ['node', 'express']
  whitelist: []
}));
```

### Comportamento

**Sem HPP:**
```javascript
// Requisição: GET /api/users?id=1&id=2&id=3
req.query.id // Pode ser '1', '3', ou ['1', '2', '3'] dependendo do framework
```

**Com HPP:**
```javascript
// Requisição: GET /api/users?id=1&id=2&id=3
req.query.id // Sempre será '3' (último valor)
```

### Whitelist para Arrays

Se você precisa que certos parâmetros aceitem múltiplos valores:

```javascript
app.use(hpp({
  whitelist: ['tags', 'categories', 'filters']
}));

// Requisição: GET /api/posts?tags=node&tags=express
// req.query.tags = ['node', 'express'] ✅

// Requisição: GET /api/users?id=1&id=2
// req.query.id = '2' ✅ (protegido)
```

### Posicionamento no Middleware Stack

O HPP deve ser aplicado **após** o parsing de JSON/URL-encoded e **antes** das rotas:

```javascript
// 1. Helmet (headers de segurança)
app.use(helmet());

// 2. CORS
app.use(cors());

// 3. Rate Limiting
app.use(generalLimiter);

// 4. Body Parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 5. HPP (protege parâmetros)
app.use(hpp());

// 6. Rotas
app.use('/api', routes);
```

### Benefícios de Segurança

✅ Previne bypass de validações através de parâmetros duplicados
✅ Garante comportamento consistente em todas as requisições
✅ Protege contra manipulação de dados via query strings
✅ Evita vulnerabilidades de lógica de negócio
✅ Compatível com validações do express-validator

## Sistema de Testes

O projeto utiliza **Jest** com **Supertest** para testes automatizados da API.

### Características
- **Framework**: Jest para execução de testes
- **HTTP Testing**: Supertest para testar endpoints da API
- **Isolamento**: Cada teste cria e limpa seus próprios dados
- **Helpers**: Funções utilitárias para gerar dados únicos
- **Cobertura**: 78 testes cobrindo todas as funcionalidades principais
- **Rate Limiting**: Automaticamente desabilitado em ambiente de testes

### Arquivos de Teste
- `__tests__/app.test.js` - Testes básicos da aplicação
- `__tests__/userRoutes.test.js` - Testes de rotas de usuários
- `__tests__/authorization.test.js` - Testes de autorização e RBAC
- `__tests__/passwordReset.test.js` - Testes de reset de senha
- `__tests__/preferences.test.js` - Testes de preferências de usuário

### Helpers de Teste (`__tests__/helpers/testUtils.js`)

O projeto inclui helpers para gerar dados únicos em cada execução de teste, evitando conflitos de chave duplicada:

```javascript
const { generateTestUsername, generateTestEmail } = require('./helpers/testUtils');

// Gerar username único (máx 30 caracteres)
const username = generateTestUsername('admin'); // admin_420123_45

// Gerar email único
const email = generateTestEmail('test'); // test_1732113420123_456@test.com
```

**Padrão de geração:**
- **Username**: `{base}_{timestamp_6digitos}_{random_0-99}` (ex: `admin_420123_45`)
- **Email**: `{base}_{timestamp}_{random_0-999}@test.com`

### Configuração Jest

```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  testPathIgnorePatterns: ['/node_modules/', '/__tests__/helpers/'],
  collectCoverageFrom: ['src/**/*.js', '!src/server.js'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html']
};
```

### Executar Testes

```bash
# Executar todos os testes
npm test

# Executar testes em modo watch (auto-reload)
npm run test:watch

# Executar testes com cobertura
npm test -- --coverage
```

### Exemplo de Teste com Dados Únicos

```javascript
const { generateTestUsername, generateTestEmail } = require('./helpers/testUtils');

test('Should create user successfully', async () => {
  const testUsername = generateTestUsername('newuser');
  const testEmail = generateTestEmail('newuser.test');

  const response = await request(app)
    .post('/api/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      first_name: 'Test',
      last_name: 'User',
      username: testUsername,
      email: testEmail,
      password: 'password123',
      role: 'user'
    });

  expect(response.status).toBe(201);
  expect(response.body.data.username).toBe(testUsername);

  // Limpar dados de teste
  await pool.query('DELETE FROM users WHERE username = $1', [testUsername]);
});
```

### Boas Práticas de Testes

1. **Sempre usar helpers para gerar dados únicos**:
   - Evita conflitos de chave duplicada
   - Permite execuções paralelas de testes
   - Testes são independentes e isolados

2. **Limpar dados após cada teste**:
   - Usar `afterEach()` ou limpeza manual no final do teste
   - Garantir que o banco de dados não fica poluído

3. **Usar beforeAll/afterAll para setup/teardown**:
   - Criar usuários de teste fixos (admin, usuário regular)
   - Fazer login e obter tokens
   - Limpar todos os dados no final

4. **Rate limiting desabilitado em testes**:
   - Middleware detecta `NODE_ENV=test` automaticamente
   - Não há limites de requisições durante testes
   - Permite executar testes rapidamente

### Resultados dos Testes

```
Test Suites: 5 passed, 5 total
Tests:       78 passed, 78 total
Snapshots:   0 total
Time:        ~10s
```

**Cobertura de testes:**
- ✅ Autenticação (registro, login, logout, refresh token)
- ✅ Autorização (RBAC, permissões por role)
- ✅ CRUD de usuários (criar, listar, buscar, atualizar, deletar)
- ✅ Reset de senha (solicitar, validar, redefinir)
- ✅ Preferências de usuário (obter, atualizar, resetar)
- ✅ Validações e erros (dados inválidos, usuários inexistentes, etc)

## Sistema de Logs

O projeto utiliza **Winston** para logging profissional com rotação automática de arquivos.

### Características
- **Níveis de log**: error, warn, info, http, debug
- **Rotação automática**: Arquivos rotacionam diariamente
- **Compressão**: Logs antigos são comprimidos automaticamente
- **Separação por tipo**: Arquivos separados para erros, HTTP e logs gerais
- **Formato configurável**: JSON ou formato simples

### Arquivos de Log
- `logs/error-YYYY-MM-DD.log` - Apenas erros
- `logs/combined-YYYY-MM-DD.log` - Todos os logs
- `logs/http-YYYY-MM-DD.log` - Logs de requisições HTTP

### Configuração no `.env`
```bash
LOG_LEVEL=info              # error, warn, info, http, debug
LOG_DIR=logs                # Diretório dos arquivos de log
LOG_MAX_SIZE=20m            # Tamanho máximo antes de rotacionar
LOG_MAX_FILES=14d           # Retenção dos arquivos (14 dias)
LOG_FORMAT=json             # json ou simple
```

### Uso no Código
```javascript
const logger = require('../config/logger');

// Diferentes níveis
logger.error('Error message', { userId: 123, error: err.message });
logger.warn('Warning message', { action: 'user_delete' });
logger.info('Info message', { userId: 123 });
logger.http('HTTP message', { method: 'GET', path: '/api/users' });
logger.debug('Debug message', { data: someData });
```

### Logs Automáticos
- **Todas as requisições HTTP** são automaticamente logadas com:
  - Método, URL, IP, User Agent
  - Status code da resposta
  - Tempo de resposta (duration)
  - ID do usuário (se autenticado)
- **Erros não tratados** são capturados e logados automaticamente

## Comandos de Lint/TypeCheck

Este projeto atualmente não possui comandos de lint ou typecheck configurados.
Se necessário, adicionar eslint ou outras ferramentas de qualidade de código.

## Documentação da API (Swagger)

A documentação completa da API está disponível através do Swagger UI:
- **Swagger UI**: http://localhost:3000/api-docs
- **Swagger JSON**: http://localhost:3000/api-docs.json
- **Docker**: http://localhost:3001/api-docs

## Endpoints Disponíveis

### Básicos
- `GET /` - Mensagem de boas-vindas
- `GET /health` - Status da API

### Autenticação
- `POST /api/users/register` - Registrar novo usuário
- `POST /api/users/login` - Login
- `POST /api/users/logout` - Logout (autenticado)
- `POST /api/users/refresh-token` - Renovar token

### Usuários (Autenticados)
- `GET /api/users` - Lista todos os usuários
- `GET /api/users/profile` - Perfil do usuário atual
- `GET /api/users/:id` - Busca usuário por ID
- `POST /api/users` - Cria novo usuário **(admin only)**
- `PUT /api/users/profile` - Atualizar perfil
- `PUT /api/users/change-password` - Trocar própria senha
- `PUT /api/users/:id/change-password` - Trocar senha de outro usuário (admin)
- `PATCH /api/users/:id/deactivate` - Inativar usuário **(admin only)**
- `DELETE /api/users/:id` - Excluir usuário (soft delete) **(admin only)**
- `DELETE /api/users/:id?hardDelete=true` - Excluir usuário permanentemente **(admin only)**

### Recuperação de Senha
- `POST /api/password-reset/request` - Solicitar reset de senha
- `POST /api/password-reset/validate-token` - Validar token de reset
- `POST /api/password-reset/reset` - Redefinir senha

### Preferências do Usuário (Autenticados)
- `GET /api/preferences` - Obter preferências do usuário autenticado
- `GET /api/preferences/:userId` - Obter preferências de outro usuário
- `PUT /api/preferences` - Criar/atualizar preferências do usuário autenticado
- `PUT /api/preferences/:userId` - Criar/atualizar preferências de outro usuário
- `DELETE /api/preferences` - Resetar preferências do usuário autenticado
- `DELETE /api/preferences/:userId` - Resetar preferências de outro usuário
- `PATCH /api/preferences/theme` - Atualizar apenas tema (usuário autenticado)

#### Campos de Preferências:
- **theme_mode**: 'light', 'dark', 'system' (segue o sistema operacional) - Padrão: 'system'
- **theme_color**: Cor principal do tema (string) - Padrão: 'blue'
- **font_size**: 'small', 'medium', 'large', 'extra-large' - Padrão: 'medium'
- **compact_mode**: Modo compacto da interface (boolean) - Padrão: false
- **animations_enabled**: Habilitar animações (boolean) - Padrão: true
- **high_contrast**: Modo de alto contraste (boolean) - Padrão: false
- **reduce_motion**: Reduzir movimento para acessibilidade (boolean) - Padrão: false

**Nota**: Quando um usuário é criado (via registro ou criação admin), as preferências padrão são automaticamente criadas no banco de dados com os valores acima. O usuário pode então modificá-las usando PUT ou PATCH conforme desejar.

## Sistema de Autorização (RBAC)

O projeto implementa controle de acesso baseado em roles (RBAC - Role-Based Access Control):

### Middleware de Autorização
```javascript
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Apenas admin
router.delete('/users/:id', authenticateToken, authorizeRoles('admin'), deleteUser);

// Admin ou moderador
router.post('/posts', authenticateToken, authorizeRoles('admin', 'moderator'), createPost);
```

### Roles Disponíveis
- **admin** - Acesso total ao sistema
- **user** - Usuário padrão com permissões básicas

### Rotas Protegidas (Admin Only)
- Criar usuário (POST /api/users)
- Inativar usuário (PATCH /api/users/:id/deactivate)
- Excluir usuário (DELETE /api/users/:id)

### Mensagens de Erro
O middleware retorna mensagens detalhadas em caso de acesso negado:
```json
{
  "error": "Acesso negado",
  "message": "Esta ação requer uma das seguintes permissões: admin",
  "required_roles": ["admin"],
  "user_role": "user",
  "timestamp": "2025-01-10T12:00:00.000Z",
  "path": "/api/users"
}
```

## Sistema de Validação e Sanitização

O projeto implementa validação e sanitização robusta usando **express-validator** em todos os endpoints.

### Middleware de Validação (`src/middleware/validation.js`)

O arquivo contém validadores específicos para cada tipo de operação:

#### Validadores Disponíveis
- `validateRegister` - Registro de novos usuários
- `validateLogin` - Login de usuários
- `validateCreateUser` - Criação de usuário por admin
- `validateUpdateProfile` - Atualização de perfil
- `validateChangePassword` - Alteração de senha do próprio usuário
- `validateAdminChangePassword` - Alteração de senha de outro usuário (admin)
- `validatePasswordResetRequest` - Solicitação de reset de senha
- `validatePasswordResetToken` - Validação de token de reset
- `validatePasswordReset` - Reset de senha com token
- `validatePreferences` - Atualização de preferências do usuário
- `validateTheme` - Atualização apenas de tema (PATCH)
- `validateUserId` - Validação de ID de usuário em parâmetros de rota
- `validateUserIdOptional` - Validação opcional de ID de usuário
- `validateRefreshToken` - Validação de refresh token

### Características da Validação

#### Validação de Tipos
- Strings, números, booleanos, datas
- Tipos específicos: email, URL, UUID
- Enums com valores permitidos

#### Validação de Comprimento
- Mínimo e máximo de caracteres
- Limites específicos por campo

#### Validação de Formato
- Regex para usernames: `^[a-zA-Z0-9_]+$`
- Regex para nomes: `^[a-zA-ZÀ-ÿ\s]+$` (inclui acentos)
- Regex para telefone: `^[0-9\s\-\+\(\)]+$`
- Regex para idioma: `^[a-z]{2}(-[A-Z]{2})?$` (ex: pt-BR)
- Formato de email validado e normalizado

#### Sanitização
Todos os campos passam por sanitização:
- `trim()` - Remove espaços
- `escape()` - Escapa HTML (<, >, &, ', ", /)
- `normalizeEmail()` - Padroniza emails
- `toInt()` - Converte para inteiro
- `toBoolean()` - Converte para boolean
- `toDate()` - Converte para data

### Exemplo de Validador

```javascript
const validateRegister = [
  body('first_name')
    .trim()
    .notEmpty().withMessage('Primeiro nome é obrigatório')
    .isLength({ min: 2, max: 50 }).withMessage('Primeiro nome deve ter entre 2 e 50 caracteres')
    .matches(/^[a-zA-ZÀ-ÿ\s]+$/).withMessage('Primeiro nome deve conter apenas letras')
    .escape(),

  body('email')
    .trim()
    .notEmpty().withMessage('Email é obrigatório')
    .isEmail().withMessage('Email inválido')
    .normalizeEmail()
    .isLength({ max: 100 }).withMessage('Email deve ter no máximo 100 caracteres'),

  handleValidationErrors
];
```

### Formato de Resposta de Erro

Quando uma validação falha:

```json
{
  "error": "Campos obrigatórios não fornecidos",
  "message": "Campos obrigatórios não fornecidos",
  "details": [
    {
      "field": "email",
      "message": "Email é obrigatório",
      "value": ""
    },
    {
      "field": "password",
      "message": "Senha é obrigatória",
      "value": ""
    }
  ]
}
```

### Mensagens Contextualizadas

O sistema adapta mensagens de erro baseado no contexto:

- **Múltiplos campos obrigatórios**: `"Campos obrigatórios não fornecidos"`
- **Preferências**: `"Validação falhou"` com detalhes específicos
- **ID inválido**: `"ID do usuário inválido"`
- **Erro único**: Mensagem específica da validação

### Uso nas Rotas

```javascript
const { validateRegister, validateLogin } = require('../middleware/validation');

// Aplicar validação antes do controller
router.post('/users/register', authLimiter, validateRegister, register);
router.post('/users/login', authLimiter, validateLogin, login);
router.put('/users/profile', authenticateToken, validateUpdateProfile, updateProfile);
```

### Validações por Rota

- **userRoutes.js**: 11 validações aplicadas
- **passwordReset.js**: 3 validações aplicadas
- **preferences.js**: 5 validações aplicadas

### Proteção Contra Ataques

A validação protege contra:
- ✅ XSS (Cross-Site Scripting) - Escape de HTML
- ✅ SQL Injection - Validação de tipos
- ✅ NoSQL Injection - Validação de tipos
- ✅ Buffer Overflow - Limites de comprimento
- ✅ CSRF - Validação de tokens e formatos

### Testes de Validação

Todos os validadores são testados:
- ✅ 78 testes passando (100% de sucesso)
- ✅ Testes de dados válidos
- ✅ Testes de dados inválidos
- ✅ Testes de campos obrigatórios faltando
- ✅ Testes de formatos incorretos
- ✅ Testes de limites de comprimento

## Notas para Desenvolvimento

### Importante para o Claude Code

⚠️ **REGRAS OBRIGATÓRIAS:**

#### Commits e Push
- **NÃO** fazer commit automaticamente após alterações
- **NÃO** fazer push automaticamente
- **APENAS** fazer commit/push quando **EXPLICITAMENTE** solicitado pelo usuário
- Se o usuário pedir "faça commit", fazer commit mas **NÃO** fazer push
- Se o usuário pedir "faça commit e push", fazer ambos
- Sempre atualizar `.env.example` quando modificar `.env`

#### Testes
- **SEMPRE** executar `npm test` após finalizar qualquer modificação no código
- Se os testes falharem, **NÃO** fazer commit/push
- Corrigir os problemas até todos os testes passarem
- Informar ao usuário os resultados dos testes
- Se novos testes forem necessários, sugerir ao usuário
- **Nota**: Rate limiting é desabilitado automaticamente em ambiente de testes (NODE_ENV=test)

### Desenvolvimento Local
- O servidor roda na porta 3000 por padrão
- Usar `nodemon` em desenvolvimento para reload automático
- Testes estão configurados para rodar com Jest
- Banco PostgreSQL deve estar rodando antes de iniciar a aplicação
- Usar `npm run init-db` para criar as tabelas necessárias

### Docker (Recomendado)
- Usar `npm run docker:up` para iniciar todos os serviços
- API disponível na porta 3001 (http://localhost:3001)
- PgAdmin disponível na porta 8080 (http://localhost:8080)
- PostgreSQL na porta 5432
- Usar `npm run docker:init-db` para inicializar o banco no container

## Workflow de Desenvolvimento

### Workflow Padrão para Modificações
1. Fazer as alterações solicitadas
2. **EXECUTAR TESTES**: `npm test` para validar que nada quebrou
3. Corrigir qualquer erro encontrado nos testes
4. Informar ao usuário sobre os resultados
5. **AGUARDAR** solicitação explícita do usuário para commit/push

### Ao modificar variáveis de ambiente
1. Editar `.env` com os novos valores
2. Atualizar `.env.example` removendo valores sensíveis
3. Documentar no CLAUDE.md e README.md se necessário
4. Executar testes para validar
5. Aguardar solicitação do usuário para commit/push