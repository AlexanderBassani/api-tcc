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

### Migrations (Sistema Unificado)
```bash
npm run migrate:up        # Executar migrations pendentes (JS e SQL)
npm run migrate:down      # Reverter última migration (apenas JS)
npm run migrate:status    # Ver status de todas as migrations

# Via Docker
npm run docker:migrate:up        # Executar migrations via Docker
npm run docker:migrate:down      # Reverter migrations via Docker
npm run docker:migrate:status    # Status das migrations via Docker
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
    - `vehicleController.js` - CRUD de veículos
    - `maintenanceController.js` - CRUD de manutenções
    - `maintenanceAttachmentController.js` - Upload e gestão de anexos de manutenção
    - `maintenanceTypeController.js` - CRUD de tipos de manutenção (admin only)
    - `serviceProviderController.js` - CRUD de prestadores de serviço
    - `fuelRecordController.js` - CRUD de registros de abastecimento com estatísticas
    - `reminderController.js` - Sistema completo de lembretes e alertas
  - `routes/` - Definição das rotas
    - `userRoutes.js` - Rotas de usuários
    - `passwordReset.js` - Rotas de reset de senha
    - `preferences.js` - Rotas de preferências
    - `vehicleRoutes.js` - Rotas de veículos
    - `maintenanceRoutes.js` - Rotas de manutenções
    - `maintenanceAttachmentRoutes.js` - Rotas de anexos de manutenção
    - `maintenanceTypeRoutes.js` - Rotas de tipos de manutenção
    - `serviceProviderRoutes.js` - Rotas de prestadores de serviço
    - `fuelRecordRoutes.js` - Rotas de registros de abastecimento
    - `reminderRoutes.js` - Rotas de lembretes
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
  - `migrate.js` - Sistema unificado de migrations (JS + SQL)
  - `migrations/` - Arquivos de migrations (JS e SQL) do sistema completo
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
- **csrf-csrf** - Proteção contra Cross-Site Request Forgery
- **cookie-parser** - Parser de cookies (necessário para CSRF)
- **multer** - Upload de arquivos (usado para anexos de manutenção)

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

## Proteção CSRF (Cross-Site Request Forgery)

O projeto utiliza **csrf-csrf** e **cookie-parser** para proteger contra ataques CSRF.

### O que é CSRF?

Cross-Site Request Forgery (CSRF) é um ataque onde um site malicioso induz o navegador do usuário a fazer requisições não autorizadas para outro site onde o usuário está autenticado.

**Exemplo de ataque:**
```html
<!-- Site malicioso evil.com -->
<form action="https://api.example.com/api/users/1" method="POST">
  <input name="role" value="admin">
</form>
<script>document.forms[0].submit();</script>
```

Se o usuário estiver logado em `api.example.com`, o navegador enviará automaticamente os cookies de autenticação, permitindo que o ataque tenha sucesso.

### Como a Proteção CSRF Funciona

O projeto usa o **Double Submit Cookie pattern**:

1. **Servidor gera um token** e o armazena em um cookie httpOnly
2. **Cliente obtém o token** via endpoint GET /api/csrf-token
3. **Cliente envia o token** no header `x-csrf-token` em requisições de mutação
4. **Servidor valida** se o token do header coincide com o cookie

### Configuração

```javascript
const cookieParser = require('cookie-parser');
const { doubleCsrf } = require('csrf-csrf');

// Cookie Parser (obrigatório)
app.use(cookieParser());

// Configuração CSRF
const doubleCsrfOptions = {
  getSecret: () => process.env.CSRF_SECRET || 'default-csrf-secret-change-in-production',
  cookieName: 'x-csrf-token',
  cookieOptions: {
    httpOnly: true,           // Não acessível via JavaScript
    sameSite: 'strict',       // Cookies apenas para mesma origem
    secure: process.env.NODE_ENV === 'production', // HTTPS em produção
    maxAge: 86400000          // 24 horas
  },
  size: 64,                   // Tamanho do token em caracteres
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'] // Métodos que não precisam de CSRF
};

const csrf = doubleCsrf(doubleCsrfOptions);
app.use('/api', csrf.doubleCsrfProtection);
```

### Variável de Ambiente

Adicione no `.env`:
```bash
CSRF_SECRET=your-random-secret-here-minimum-32-characters
```

⚠️ **IMPORTANTE**: Gere um secret forte e aleatório em produção!

```bash
# Gerar um secret aleatório
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Endpoint para Obter Token

```javascript
// GET /api/csrf-token
app.get('/api/csrf-token', (req, res) => {
  const token = generateToken(req, res);
  res.json({
    token,
    headerName: 'x-csrf-token',
    cookieName: 'x-csrf-token'
  });
});
```

### Como Usar no Cliente

#### 1. Obter o Token CSRF

```javascript
// Fazer requisição para obter o token
const response = await fetch('http://localhost:3000/api/csrf-token', {
  credentials: 'include' // IMPORTANTE: incluir cookies
});

const { token, headerName } = await response.json();
```

#### 2. Incluir o Token em Requisições de Mutação

```javascript
// POST, PUT, DELETE, PATCH devem incluir o token
await fetch('http://localhost:3000/api/users/profile', {
  method: 'PUT',
  credentials: 'include', // Incluir cookies
  headers: {
    'Content-Type': 'application/json',
    'x-csrf-token': token, // Token CSRF
    'Authorization': `Bearer ${accessToken}` // JWT
  },
  body: JSON.stringify({ first_name: 'John' })
});
```

#### 3. Requisições GET Não Precisam de Token

```javascript
// GET, HEAD, OPTIONS são automaticamente ignorados
await fetch('http://localhost:3000/api/users/profile', {
  credentials: 'include',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
```

### Métodos Protegidos

- ✅ **POST** - Requer CSRF token
- ✅ **PUT** - Requer CSRF token
- ✅ **DELETE** - Requer CSRF token
- ✅ **PATCH** - Requer CSRF token
- ⛔ **GET** - Não requer (seguro)
- ⛔ **HEAD** - Não requer (seguro)
- ⛔ **OPTIONS** - Não requer (seguro)

### Resposta de Erro CSRF

Quando o token está ausente ou inválido:

```json
{
  "error": "ForbiddenError: invalid csrf token"
}
```

Status code: **403 Forbidden**

### Desabilitado em Ambiente de Teste

Para não quebrar os testes existentes, o CSRF é automaticamente desabilitado quando `NODE_ENV=test`:

```javascript
const csrfEnabled = process.env.NODE_ENV !== 'test';

if (csrfEnabled) {
  // Configura CSRF normalmente
} else {
  // Mock middleware que não faz nada
  csrfProtection = (req, res, next) => next();
  generateToken = (req, res) => 'test-token';
}
```

### Posicionamento no Middleware Stack

```javascript
// 1. Helmet
app.use(helmet());

// 2. CORS
app.use(cors());

// 3. Rate Limiting
app.use(generalLimiter);

// 4. Body Parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 5. HPP
app.use(hpp());

// 6. Cookie Parser (obrigatório para CSRF)
app.use(cookieParser());

// 7. CSRF Protection
app.use('/api', csrfProtection);

// 8. Rotas
app.use('/api', userRoutes);
```

### Benefícios de Segurança

✅ Previne ataques CSRF em requisições de mutação
✅ Double Submit Cookie pattern (resistente a ataques)
✅ Cookie httpOnly (não acessível via JavaScript)
✅ SameSite strict (proteção adicional)
✅ Secure em produção (apenas HTTPS)
✅ Compatível com autenticação JWT
✅ Não quebra testes automatizados

### Limitações e Considerações

⚠️ **CORS**: O CSRF protection funciona melhor com `credentials: 'include'`
⚠️ **Mobile Apps**: Podem ter dificuldade com cookies - considere usar apenas JWT
⚠️ **SameSite**: Pode causar problemas em alguns navegadores antigos
⚠️ **Secret**: Use um secret forte e único em produção

## Sistema de Testes

O projeto utiliza **Jest** com **Supertest** para testes automatizados da API.

### Características
- **Framework**: Jest para execução de testes
- **HTTP Testing**: Supertest para testar endpoints da API
- **Isolamento**: Cada teste cria e limpa seus próprios dados
- **Helpers**: Funções utilitárias para gerar dados únicos
- **Cobertura**: 176 testes cobrindo todas as funcionalidades principais
- **Configuração Automática**: `NODE_ENV=test` configurado automaticamente
- **Segurança**: CSRF e Rate Limiting automaticamente desabilitados em testes

### Arquivos de Teste
- `__tests__/setup.js` - Configuração global automática (NODE_ENV=test)
- `__tests__/app.test.js` - Testes básicos da aplicação
- `__tests__/userRoutes.test.js` - Testes de rotas de usuários
- `__tests__/authorization.test.js` - Testes de autorização e RBAC
- `__tests__/passwordReset.test.js` - Testes de reset de senha
- `__tests__/preferences.test.js` - Testes de preferências de usuário
- `__tests__/vehicleRoutes.test.js` - Testes de rotas de veículos
- `__tests__/maintenanceRoutes.test.js` - Testes de rotas de manutenções
- `__tests__/maintenanceAttachmentRoutes.test.js` - Testes de anexos de manutenção (34 testes)

### Helpers de Teste (`__tests__/helpers/testUtils.js`)

O projeto inclui helpers para gerar dados únicos em cada execução de teste, evitando conflitos de chave duplicada:

```javascript
const { generateTestUsername, generateTestEmail, generateTestPlate } = require('./helpers/testUtils');

// Gerar username único (máx 30 caracteres)
const username = generateTestUsername('admin'); // admin_420123_45

// Gerar email único
const email = generateTestEmail('test'); // test_1732113420123_456@test.com

// Gerar placa única (Mercosul ou antiga)
const plate = generateTestPlate('mercosul'); // ABC1D23 ou ABC1234
```

**Padrão de geração:**
- **Username**: `{base}_{timestamp_6digitos}_{random_0-99}` (ex: `admin_420123_45`)
- **Email**: `{base}_{timestamp}_{random_0-999}@test.com`
- **Placa**: Formato Mercosul (`ABC1D23`) ou antigo (`ABC1234`)

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
npm run test

# Executar testes em modo watch (auto-reload)
npm run test:watch

# Executar testes com cobertura
npm run test -- --coverage
```

### Exemplo de Teste com Dados Únicos

```javascript
const { generateTestUsername, generateTestEmail, generateTestPlate } = require('./helpers/testUtils');

test('Should create vehicle successfully', async () => {
  const testPlate = generateTestPlate('mercosul');

  const response = await request(app)
    .post('/api/vehicles')
    .set('Authorization', `Bearer ${userToken}`)
    .send({
      brand: 'Toyota',
      model: 'Corolla',
      year: 2020,
      plate: testPlate,
      color: 'Branco',
      current_km: 15000
    });

  expect(response.status).toBe(201);
  expect(response.body.data.plate).toBe(testPlate);

  // Limpar dados de teste
  await pool.query('DELETE FROM vehicles WHERE plate = $1', [testPlate]);
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
Test Suites: 8 passed, 8 total
Tests:       176 passed, 176 total
Snapshots:   0 total
Time:        ~7s
```

**Cobertura de testes:**
- ✅ Autenticação (registro, login, logout, refresh token)
- ✅ Autorização (RBAC, permissões por role)
- ✅ CRUD de usuários (criar, listar, buscar, atualizar, deletar)
- ✅ Reset de senha (solicitar, validar, redefinir)
- ✅ Preferências de usuário (obter, atualizar, resetar)
- ✅ CRUD de veículos (criar, listar, buscar, atualizar, inativar, deletar)
- ✅ CRUD de manutenções (criar, listar, buscar, atualizar, marcar como concluída, deletar)
- ✅ **Anexos de manutenção** (upload, download, listar, atualizar, excluir, validação de tipos)
- ✅ Validações e erros (dados inválidos, usuários inexistentes, etc)
- ✅ Segurança e autorização (acesso restrito por usuário, validação de permissões)

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
- `PUT /api/users/:id` - Atualizar usuário **(admin only)**
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

### Veículos (Autenticados)
- `GET /api/vehicles` - Listar veículos ativos do usuário autenticado
- `GET /api/vehicles/inactive` - Listar veículos inativos do usuário autenticado
- `GET /api/vehicles/:id` - Buscar veículo específico do usuário autenticado
- `POST /api/vehicles` - Criar novo veículo para o usuário autenticado
- `PUT /api/vehicles/:id` - Atualizar veículo do usuário autenticado
- `PATCH /api/vehicles/:id/inactivate` - Inativar veículo (soft delete)
- `PATCH /api/vehicles/:id/reactivate` - Reativar veículo
- `DELETE /api/vehicles/:id` - Excluir veículo permanentemente (hard delete)
- `GET /api/vehicles/user/:userId` - Listar veículos de usuário específico **(admin only)**

### Manutenções (Autenticados)
- `GET /api/maintenances` - Listar manutenções do usuário autenticado
- `GET /api/maintenances/stats` - Obter estatísticas de manutenções do usuário
- `GET /api/maintenances/vehicle/:vehicleId` - Listar manutenções de um veículo específico
- `GET /api/maintenances/:id` - Buscar manutenção específica
- `POST /api/maintenances` - Criar registro de manutenção
- `PUT /api/maintenances/:id` - Atualizar registro de manutenção
- `PATCH /api/maintenances/:id/complete` - Marcar manutenção como concluída
- `DELETE /api/maintenances/:id` - Excluir registro de manutenção

### Anexos de Manutenção (Autenticados)
- `GET /api/maintenance-attachments/maintenance/:maintenanceId` - Listar anexos de uma manutenção
- `GET /api/maintenance-attachments/:id` - Buscar anexo específico
- `POST /api/maintenance-attachments/maintenance/:maintenanceId/upload` - Upload de anexos (máx 5 arquivos)
- `GET /api/maintenance-attachments/:id/download` - Download de anexo
- `PUT /api/maintenance-attachments/:id` - Atualizar nome do anexo
- `DELETE /api/maintenance-attachments/:id` - Excluir anexo

**Tipos de arquivo permitidos:** JPEG, JPG, PNG, GIF, PDF, TXT
**Tamanho máximo:** 10MB por arquivo
**Upload múltiplo:** Até 5 arquivos por requisição

### Tipos de Manutenção (Autenticados)
- `GET /api/maintenance-types` - Listar todos os tipos de manutenção (com filtros: has_km_interval, has_month_interval)
- `GET /api/maintenance-types/:id` - Buscar tipo específico
- `POST /api/maintenance-types` - Criar novo tipo **(admin only)**
- `PUT /api/maintenance-types/:id` - Atualizar tipo **(admin only)**
- `DELETE /api/maintenance-types/:id` - Excluir tipo **(admin only)**

### Prestadores de Serviço (Autenticados)
- `GET /api/service-providers` - Listar prestadores (com filtros: type, is_favorite, min_rating)
- `GET /api/service-providers/favorites` - Listar apenas favoritos
- `GET /api/service-providers/type/:type` - Listar por tipo específico
- `GET /api/service-providers/:id` - Buscar prestador específico
- `POST /api/service-providers` - Criar novo prestador
- `PUT /api/service-providers/:id` - Atualizar prestador
- `DELETE /api/service-providers/:id` - Excluir prestador

### Registros de Abastecimento (Autenticados)
- `GET /api/fuel-records` - Listar registros (com filtros: vehicle_id, fuel_type, start_date, end_date)
- `GET /api/fuel-records/vehicle/:vehicleId` - Listar registros de um veículo
- `GET /api/fuel-records/vehicle/:vehicleId/statistics` - Estatísticas de consumo do veículo
- `GET /api/fuel-records/:id` - Buscar registro específico
- `POST /api/fuel-records` - Criar novo registro
- `PUT /api/fuel-records/:id` - Atualizar registro
- `DELETE /api/fuel-records/:id` - Excluir registro

### Lembretes (Autenticados)
- `GET /api/reminders` - Listar lembretes (com filtros: status, type, vehicle_id)
- `GET /api/reminders/pending` - Listar lembretes pendentes (próximos de vencer)
- `GET /api/reminders/vehicle/:vehicleId` - Listar lembretes de um veículo
- `GET /api/reminders/:id` - Buscar lembrete específico
- `POST /api/reminders` - Criar novo lembrete
- `PUT /api/reminders/:id` - Atualizar lembrete
- `PATCH /api/reminders/:id/complete` - Marcar como concluído
- `PATCH /api/reminders/:id/dismiss` - Marcar como descartado
- `DELETE /api/reminders/:id` - Excluir lembrete

#### Campos de Preferências:
- **theme_mode**: 'light', 'dark', 'system' (segue o sistema operacional) - Padrão: 'system'
- **theme_color**: Cor principal do tema (string) - Padrão: 'blue'
- **font_size**: 'small', 'medium', 'large', 'extra-large' - Padrão: 'medium'
- **compact_mode**: Modo compacto da interface (boolean) - Padrão: false
- **animations_enabled**: Habilitar animações (boolean) - Padrão: true
- **high_contrast**: Modo de alto contraste (boolean) - Padrão: false
- **reduce_motion**: Reduzir movimento para acessibilidade (boolean) - Padrão: false

**Nota**: Quando um usuário é criado (via registro ou criação admin), as preferências padrão são automaticamente criadas no banco de dados com os valores acima. O usuário pode então modificá-las usando PUT ou PATCH conforme desejar.

#### Campos de Veículos:
- **brand**: Marca do veículo (string, obrigatório)
- **model**: Modelo do veículo (string, obrigatório)
- **year**: Ano do veículo (inteiro, 1900-2030, obrigatório)
- **plate**: Placa do veículo (string única, formatos Mercosul ou antigo, obrigatório)
- **color**: Cor do veículo (string, opcional)
- **current_km**: Quilometragem atual (inteiro >= 0, padrão: 0)
- **purchase_date**: Data de aquisição (date, opcional)
- **notes**: Observações adicionais (string, opcional)
- **is_active**: Status ativo/inativo (boolean, padrão: true)

**Nota**: Cada veículo é automaticamente vinculado ao usuário que o criou. Apenas o proprietário pode visualizar e modificar seus veículos, exceto admins que podem listar veículos de qualquer usuário.

#### Campos de Manutenções:
- **vehicle_id**: ID do veículo (inteiro, obrigatório, deve pertencer ao usuário)
- **maintenance_type_id**: Tipo de manutenção (inteiro, opcional)
- **service_provider_id**: Prestador de serviço (inteiro, opcional)
- **description**: Descrição da manutenção (string, obrigatório)
- **cost**: Custo da manutenção (decimal >= 0, obrigatório)
- **service_date**: Data do serviço (date, obrigatório)
- **km_at_service**: Quilometragem no momento do serviço (inteiro >= 0, obrigatório)
- **is_completed**: Status de conclusão (boolean, padrão: false)
- **notes**: Observações adicionais (string, opcional)

**Nota**: Cada manutenção é vinculada a um veículo específico. Apenas o proprietário do veículo pode criar e gerenciar suas manutenções, exceto admins que podem listar manutenções de qualquer usuário.

#### Campos de Anexos de Manutenção:
- **maintenance_id**: ID da manutenção (inteiro, obrigatório, deve pertencer ao usuário)
- **file_name**: Nome original do arquivo (string, 1-255 caracteres)
- **file_path**: Caminho de armazenamento do arquivo (string, gerado automaticamente)
- **file_type**: Tipo MIME do arquivo (string, gerado automaticamente)
- **file_size**: Tamanho do arquivo em bytes (inteiro, gerado automaticamente)
- **uploaded_at**: Data/hora do upload (timestamp, gerado automaticamente)

**Tipos de arquivo permitidos:**
- Imagens: JPEG, JPG, PNG, GIF
- Documentos: PDF, TXT
- Tamanho máximo: 10MB por arquivo
- Máximo: 5 arquivos por upload

**Funcionalidades:**
- Upload múltiplo de arquivos
- Download seguro com verificação de permissão  
- Renomeação de arquivos
- Exclusão com remoção do arquivo físico
- Listagem por manutenção

**Nota**: Apenas o proprietário do veículo pode fazer upload, visualizar e gerenciar anexos de suas manutenções. Arquivos são armazenados em `uploads/maintenance-attachments/` com nomes únicos gerados automaticamente.

### Tipos de Manutenção (Autenticados)
- `GET /api/maintenance-types` - Listar todos os tipos de manutenção (com filtros: has_km_interval, has_month_interval)
- `GET /api/maintenance-types/:id` - Buscar tipo específico
- `POST /api/maintenance-types` - Criar novo tipo **(admin only)**
- `PUT /api/maintenance-types/:id` - Atualizar tipo **(admin only)**
- `DELETE /api/maintenance-types/:id` - Excluir tipo **(admin only)**

#### Campos de Tipos de Manutenção:
- **name**: Nome técnico do tipo (string única, obrigatório)
- **display_name**: Nome de exibição (string, obrigatório)
- **typical_interval_km**: Intervalo típico em quilômetros (inteiro >= 0, opcional)
- **typical_interval_months**: Intervalo típico em meses (inteiro >= 0, opcional)
- **icon**: Ícone do tipo (string, opcional)

**Nota**: Os tipos são globais e podem ser criados apenas por admins. Usuários regulares podem apenas listar e visualizar.

### Prestadores de Serviço (Autenticados)
- `GET /api/service-providers` - Listar prestadores (com filtros: type, is_favorite, min_rating)
- `GET /api/service-providers/favorites` - Listar apenas favoritos
- `GET /api/service-providers/type/:type` - Listar por tipo específico
- `GET /api/service-providers/:id` - Buscar prestador específico
- `POST /api/service-providers` - Criar novo prestador
- `PUT /api/service-providers/:id` - Atualizar prestador
- `DELETE /api/service-providers/:id` - Excluir prestador

#### Campos de Prestadores de Serviço:
- **name**: Nome do prestador (string, obrigatório)
- **type**: Tipo do prestador - 'mechanic', 'bodyshop', 'dealer', 'specialist', 'other' (string, obrigatório)
- **phone**: Telefone (string, opcional)
- **email**: Email (string, opcional)
- **address**: Endereço completo (string, opcional)
- **rating**: Avaliação de 0.0 a 5.0 (decimal, padrão: 0.0)
- **notes**: Observações (string, opcional)
- **is_favorite**: Marcar como favorito (boolean, padrão: false)

**Nota**: Cada prestador pertence ao usuário que o criou. Permite gerenciar oficinas, mecânicos e outros prestadores de serviço.

### Registros de Abastecimento (Autenticados)
- `GET /api/fuel-records` - Listar registros (com filtros: vehicle_id, fuel_type, start_date, end_date)
- `GET /api/fuel-records/vehicle/:vehicleId` - Listar registros de um veículo
- `GET /api/fuel-records/vehicle/:vehicleId/statistics` - Estatísticas de consumo do veículo
- `GET /api/fuel-records/:id` - Buscar registro específico
- `POST /api/fuel-records` - Criar novo registro
- `PUT /api/fuel-records/:id` - Atualizar registro
- `DELETE /api/fuel-records/:id` - Excluir registro

#### Campos de Registros de Abastecimento:
- **vehicle_id**: ID do veículo (inteiro, obrigatório)
- **date**: Data do abastecimento (date, obrigatório)
- **km**: Quilometragem no momento do abastecimento (inteiro >= 0, obrigatório)
- **liters**: Litros abastecidos (decimal > 0, obrigatório)
- **price_per_liter**: Preço por litro (decimal > 0, obrigatório)
- **total_cost**: Custo total (calculado automaticamente: liters * price_per_liter)
- **fuel_type**: Tipo de combustível - 'gasoline', 'ethanol', 'diesel', 'gnv', 'flex' (string, padrão: 'gasoline')
- **is_full_tank**: Tanque cheio (boolean, padrão: false) - usado para cálculo de consumo
- **gas_station**: Nome do posto (string, opcional)
- **notes**: Observações (string, opcional)

**Funcionalidades:**
- Cálculo automático de consumo médio (km/l) com tanques cheios consecutivos
- Estatísticas por tipo de combustível
- Atualização automática da quilometragem do veículo
- Validação de sequência de quilometragem

### Lembretes (Autenticados)
- `GET /api/reminders` - Listar lembretes (com filtros: status, type, vehicle_id)
- `GET /api/reminders/pending` - Listar lembretes pendentes (próximos de vencer)
- `GET /api/reminders/vehicle/:vehicleId` - Listar lembretes de um veículo
- `GET /api/reminders/:id` - Buscar lembrete específico
- `POST /api/reminders` - Criar novo lembrete
- `PUT /api/reminders/:id` - Atualizar lembrete
- `PATCH /api/reminders/:id/complete` - Marcar como concluído
- `PATCH /api/reminders/:id/dismiss` - Marcar como descartado
- `DELETE /api/reminders/:id` - Excluir lembrete

#### Campos de Lembretes:
- **vehicle_id**: ID do veículo (inteiro, obrigatório)
- **type**: Tipo do lembrete - 'maintenance', 'inspection', 'insurance', 'licensing', 'tax', 'other' (string, obrigatório)
- **title**: Título do lembrete (string, obrigatório)
- **description**: Descrição detalhada (string, opcional)
- **remind_at_km**: Lembrar ao atingir esta quilometragem (inteiro >= 0, opcional)
- **remind_at_date**: Lembrar nesta data (date, opcional)
- **status**: Status - 'pending', 'completed', 'dismissed' (string, padrão: 'pending')
- **is_recurring**: Lembrete recorrente (boolean, padrão: false)
- **recurrence_km**: Recorrência em quilômetros (inteiro >= 0, opcional)
- **recurrence_months**: Recorrência em meses (inteiro >= 0, opcional)
- **completed_at**: Data de conclusão (timestamp, automático)

**Funcionalidades:**
- Lembretes por quilometragem OU data (pelo menos um obrigatório)
- Sistema de status (pending, completed, dismissed)
- Lembretes recorrentes automáticos
- Endpoint especial para listar pendentes (próximos 30 dias ou 500km)
- Cálculos automáticos de dias/km até vencimento

### Dashboard (Autenticados)
- `GET /api/dashboard/overview` - Visão geral completa do dashboard (despesas, atividades, lembretes)
- `GET /api/dashboard/monthly-expenses` - Despesas mensais (combustível, manutenção, outros)
- `GET /api/dashboard/upcoming-maintenances` - Manutenções próximas
- `GET /api/dashboard/recent-activities` - Atividades recentes (abastecimentos e manutenções)

#### Query Parameters:
- **months**: Número de meses (1-12, padrão: 6) - para monthly-expenses
- **limit**: Limite de resultados (1-50, padrão varia por endpoint)
- **vehicle_id**: Filtrar por veículo específico (opcional em todos os endpoints)

**Funcionalidades:**
- Agregação de despesas por tipo (combustível, manutenção, outros)
- Cálculo automático de percentuais
- Timeline de atividades recentes combinando abastecimentos e manutenções
- Lembretes ordenados por proximidade (data ou quilometragem)
- Suporte a filtro por veículo em todos os endpoints

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
- Listar veículos de usuário específico (GET /api/vehicles/user/:userId)
- Listar manutenções de usuário específico (GET /api/maintenances/user/:userId)
- Criar tipo de manutenção (POST /api/maintenance-types)
- Atualizar tipo de manutenção (PUT /api/maintenance-types/:id)
- Excluir tipo de manutenção (DELETE /api/maintenance-types/:id)

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

**Usuários e Autenticação:**
- `validateRegister` - Registro de novos usuários
- `validateLogin` - Login de usuários
- `validateCreateUser` - Criação de usuário por admin
- `validateUpdateProfile` - Atualização de perfil
- `validateChangePassword` - Alteração de senha do próprio usuário
- `validateAdminChangePassword` - Alteração de senha de outro usuário (admin)
- `validateRefreshToken` - Validação de refresh token
- `validateUserId` - Validação de ID de usuário em parâmetros de rota
- `validateUserIdOptional` - Validação opcional de ID de usuário
- `validateUserIdParam` - Validação de ID de usuário em parâmetros de rota (admin)

**Reset de Senha:**
- `validatePasswordResetRequest` - Solicitação de reset de senha
- `validatePasswordResetToken` - Validação de token de reset
- `validatePasswordReset` - Reset de senha com token

**Preferências:**
- `validatePreferences` - Atualização de preferências do usuário
- `validateTheme` - Atualização apenas de tema (PATCH)

**Veículos:**
- `validateCreateVehicle` - Validação para criação de veículos
- `validateUpdateVehicle` - Validação para atualização de veículos
- `validateVehicleId` - Validação de ID de veículo em parâmetros de rota

**Manutenções:**
- `validateCreateMaintenance` - Validação para criação de manutenções
- `validateUpdateMaintenance` - Validação para atualização de manutenções
- `validateMaintenanceId` - Validação de ID de manutenção em parâmetros de rota
- `validateCompleteMaintenance` - Validação para marcar manutenção como concluída

**Anexos de Manutenção:**
- `validateMaintenanceIdParam` - Validação de ID de manutenção em parâmetros
- `validateAttachmentId` - Validação de ID de anexo
- `validateUpdateAttachment` - Validação para atualizar nome de anexo

**Tipos de Manutenção:**
- `validateCreateMaintenanceType` - Validação para criar tipo de manutenção
- `validateUpdateMaintenanceType` - Validação para atualizar tipo de manutenção
- `validateMaintenanceTypeId` - Validação de ID de tipo de manutenção

**Prestadores de Serviço:**
- `validateCreateServiceProvider` - Validação para criar prestador
- `validateUpdateServiceProvider` - Validação para atualizar prestador
- `validateServiceProviderId` - Validação de ID de prestador

**Registros de Abastecimento:**
- `validateCreateFuelRecord` - Validação para criar registro de abastecimento
- `validateUpdateFuelRecord` - Validação para atualizar registro
- `validateFuelRecordId` - Validação de ID de registro de abastecimento

**Lembretes:**
- `validateCreateReminder` - Validação para criar lembrete
- `validateUpdateReminder` - Validação para atualizar lembrete
- `validateReminderId` - Validação de ID de lembrete
- `validateReminderStatus` - Validação para alterar status de lembrete

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
- Regex para placa de veículo: `^[A-Z]{3}[0-9][A-Z][0-9]{2}$|^[A-Z]{3}[0-9]{4}$/i` (Mercosul e antiga)
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
const { validateRegister, validateLogin, validateCreateVehicle } = require('../middleware/validation');

// Aplicar validação antes do controller
router.post('/users/register', authLimiter, validateRegister, register);
router.post('/users/login', authLimiter, validateLogin, login);
router.post('/vehicles', authenticateToken, validateCreateVehicle, createVehicle);
```

### Validações por Rota

- **userRoutes.js**: 11 validações aplicadas
- **passwordReset.js**: 3 validações aplicadas
- **preferences.js**: 5 validações aplicadas
- **vehicleRoutes.js**: 8 validações aplicadas
- **maintenanceRoutes.js**: 6 validações aplicadas
- **maintenanceAttachmentRoutes.js**: 5 validações aplicadas
- **maintenanceTypeRoutes.js**: 5 validações aplicadas
- **serviceProviderRoutes.js**: 6 validações aplicadas
- **fuelRecordRoutes.js**: 6 validações aplicadas
- **reminderRoutes.js**: 8 validações aplicadas

### Proteção Contra Ataques

A validação protege contra:
- ✅ XSS (Cross-Site Scripting) - Escape de HTML
- ✅ SQL Injection - Validação de tipos
- ✅ NoSQL Injection - Validação de tipos
- ✅ Buffer Overflow - Limites de comprimento
- ✅ CSRF - Validação de tokens e formatos

### Testes de Validação

Todos os validadores são testados:
- ✅ 143 testes passando (100% de sucesso)
- ✅ Testes de dados válidos
- ✅ Testes de dados inválidos
- ✅ Testes de campos obrigatórios faltando
- ✅ Testes de formatos incorretos
- ✅ Testes de limites de comprimento

## Sistema de Migrations Completo

O projeto possui um sistema completo de migrations SQL que implementa o diagrama ER descrito em `DIAGRAMA_ER_DESCRICAO.md`.

### Migrations Disponíveis

1. **000_add_role_to_users.sql** - Adiciona coluna role para RBAC (convertida de JS)
2. **001_create_user_preferences.sql** - Tabela de preferências do usuário
3. **002_create_vehicles.sql** - Tabela de veículos
4. **003_create_maintenance_types.sql** - Tipos de manutenção padronizados
5. **004_create_service_providers.sql** - Prestadores de serviço (oficinas)
6. **005_create_maintenances.sql** - Registros de manutenção
7. **006_create_maintenance_attachments.sql** - Anexos das manutenções
8. **007_create_fuel_records.sql** - Registros de abastecimento
9. **008_create_reminders.sql** - Sistema de lembretes e alertas
10. **009_create_utility_functions.sql** - Funções e triggers auxiliares
11. **010_create_sample_data.sql** - Dados iniciais e configurações

**Sistema Unificado**: O script `migrate.js` agora suporta tanto arquivos `.js` quanto `.sql` na pasta `scripts/migrations/`, executando-os em ordem alfabética e registrando o tipo de cada migration.

### Funcionalidades Implementadas

#### Sistema de Veículos
- Cadastro completo de veículos por usuário
- Controle de quilometragem atual automático
- Soft delete e status ativo/inativo

#### Sistema de Manutenções
- Registros detalhados de manutenções
- Anexos (fotos, notas fiscais)
- Vínculo com prestadores de serviço
- Tipos padronizados de manutenção

#### Sistema de Abastecimento
- Registro de combustível com cálculo de consumo
- Validação de sequência de quilometragem
- Diferentes tipos de combustível

#### Sistema de Lembretes Inteligentes
- Lembretes por quilometragem ou data
- Lembretes recorrentes automáticos
- Alertas de documentos (IPVA, licenciamento)
- Status de acompanhamento

#### Funções Auxiliares
- Atualização automática de quilometragem
- Criação automática de lembretes padrão
- Views para estatísticas e alertas
- Cálculos de consumo e custos

### Relacionamentos e Integridade
- CASCADE DELETE para registros dependentes
- SET NULL para referências opcionais
- Constraints para validação de dados
- Indexes para performance otimizada

### Views Criadas
- **pending_reminders**: Alertas pendentes com cálculos
- **vehicle_statistics**: Estatísticas completas por veículo

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