# API Node.js com Express, JWT e PostgreSQL

Uma API RESTful construída com Node.js, Express, autenticação JWT, Jest para testes e PostgreSQL como banco de dados, com suporte completo a Docker e hot-reload.

## 🚀 Instalação Rápida com Docker (Recomendado)

### Pré-requisitos
- Docker
- Docker Compose

### Iniciar a aplicação
```bash
# Iniciar todos os serviços (API + PostgreSQL + PgAdmin)
npm run docker:up

# Inicializar o banco de dados e criar usuário admin
npm run init-db
```

A aplicação estará disponível em:
- **API:** http://localhost:3001
- **PgAdmin:** http://localhost:8080 (admin@admin.com / admin123)

### Comandos Docker úteis
```bash
npm run docker:up      # Iniciar serviços
npm run docker:down    # Parar serviços
npm run docker:logs    # Ver logs
npm run docker:dev     # Desenvolvimento com rebuild
```

## 📋 Instalação Manual (sem Docker)

1. Clone o repositório
2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente no arquivo `.env`:
```env
# Database Configuration
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=api_db
DB_PORT=5432

# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-secret-key-change-this-in-production
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=your-refresh-secret-key-change-this-in-production
JWT_REFRESH_EXPIRES_IN=7d

# Email Configuration (Password Reset)
EMAIL_FROM=noreply@api.com
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# Frontend URL (for password reset links and CORS)
FRONTEND_URL=http://localhost:3000

# CORS Configuration
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000,http://localhost:3001

# Request Body Size Limits
JSON_LIMIT=10mb
URL_ENCODED_LIMIT=10mb
```
⚠️ **IMPORTANTE:** Altere as chaves JWT e configurações de email em produção!

4. Certifique-se de que o PostgreSQL está rodando e crie o banco de dados `api_db`
5. Inicialize o banco de dados:
```bash
npm run init-db
```

## 📜 Scripts Disponíveis

### Desenvolvimento Local
- `npm start` - Inicia o servidor em produção
- `npm run dev` - Inicia o servidor em modo desenvolvimento (com nodemon)
- `npm run dev:debug` - Inicia com debugger habilitado (porta 9229)
- `npm test` - Executa os testes
- `npm run test:watch` - Executa os testes em modo watch
- `npm run init-db` - Inicializa o banco de dados

### Migrations
- `npm run migrate:up` - Executa todas as migrations pendentes
- `npm run migrate:down` - Reverte a última migration executada
- `npm run migrate:status` - Mostra o status de todas as migrations

### Docker
- `npm run docker:build` - Constrói as imagens Docker
- `npm run docker:up` - Inicia todos os serviços
- `npm run docker:down` - Para todos os serviços
- `npm run docker:logs` - Visualiza logs dos containers
- `npm run docker:init-db` - Inicializa banco no container
- `npm run docker:migrate:up` - Executa migrations no container
- `npm run docker:migrate:down` - Reverte migration no container
- `npm run docker:migrate:status` - Status das migrations no container
- `npm run docker:dev` - Desenvolvimento com rebuild automático

## 🌐 Endpoints da API

### Básicos
- `GET /` - Retorna mensagem de boas-vindas
- `GET /health` - Retorna status da API

### Autenticação (Público)
- `POST /api/users/register` - Registrar novo usuário (retorna JWT)
- `POST /api/users/login` - Login com username/email e senha (retorna JWT)
- `POST /api/users/refresh-token` - Renovar token de acesso

### Recuperação de Senha (Público)
- `POST /api/password-reset/request` - Solicitar reset de senha (envia email)
- `POST /api/password-reset/validate-token` - Validar token de reset
- `POST /api/password-reset/reset` - Redefinir senha com token

### Usuários (Requer autenticação JWT)
- `GET /api/users` - Lista todos os usuários
- `GET /api/users/profile` - Ver perfil do usuário autenticado
- `GET /api/users/:id` - Buscar usuário por ID
- `POST /api/users` - Criar novo usuário **(admin only)**
- `PUT /api/users/profile` - Atualizar perfil do usuário autenticado
- `PUT /api/users/change-password` - Alterar senha (usuário logado)
- `PUT /api/users/:id/change-password` - Alterar senha de outro usuário (admin)
- `PATCH /api/users/:id/deactivate` - Inativar usuário **(admin only)**
- `DELETE /api/users/:id` - Excluir usuário (soft delete) **(admin only)**
- `DELETE /api/users/:id?hardDelete=true` - Excluir usuário permanentemente **(admin only)**

### Preferências do Usuário (Requer autenticação JWT)
- `GET /api/preferences` - Obter preferências do usuário autenticado
- `GET /api/preferences/:userId` - Obter preferências de outro usuário por ID
- `PUT /api/preferences` - Criar ou atualizar preferências do usuário autenticado
- `PUT /api/preferences/:userId` - Criar ou atualizar preferências de outro usuário
- `PATCH /api/preferences/theme` - Atualizar apenas configurações de tema (usuário autenticado)
- `DELETE /api/preferences` - Resetar preferências do usuário autenticado
- `DELETE /api/preferences/:userId` - Resetar preferências de outro usuário

### Veículos (Requer autenticação JWT)
- `GET /api/vehicles` - Listar veículos ativos do usuário autenticado
- `GET /api/vehicles/inactive` - Listar veículos inativos do usuário autenticado
- `GET /api/vehicles/:id` - Buscar veículo específico do usuário autenticado
- `POST /api/vehicles` - Criar novo veículo para o usuário autenticado
- `PUT /api/vehicles/:id` - Atualizar veículo do usuário autenticado
- `PATCH /api/vehicles/:id/inactivate` - Inativar veículo (soft delete)
- `PATCH /api/vehicles/:id/reactivate` - Reativar veículo
- `DELETE /api/vehicles/:id` - Excluir veículo permanentemente (hard delete)
- `GET /api/vehicles/user/:userId` - Listar veículos de usuário específico **(admin only)**

### Manutenções (Requer autenticação JWT)
- `GET /api/maintenances` - Listar manutenções do usuário autenticado
- `GET /api/maintenances/:id` - Buscar manutenção específica
- `POST /api/maintenances` - Criar registro de manutenção
- `PUT /api/maintenances/:id` - Atualizar registro de manutenção
- `PATCH /api/maintenances/:id/complete` - Marcar manutenção como concluída
- `DELETE /api/maintenances/:id` - Excluir registro de manutenção
- `GET /api/maintenances/user/:userId` - Listar manutenções de usuário específico **(admin only)**

### Autenticação JWT
Para rotas protegidas, adicione o header:
```
Authorization: Bearer {seu_token_jwt}
```

## 👤 Usuário Administrador

O sistema cria automaticamente um usuário administrador:
- **Email:** admin@sistema.com
- **Username:** admin
- **Senha:** admin123
- **Role:** admin

⚠️ **IMPORTANTE:** Altere a senha após o primeiro login!

## 🔑 Sistema de Roles e Autorização (RBAC)

O sistema implementa controle de acesso baseado em roles (RBAC - Role-Based Access Control):

### Roles Disponíveis
- **admin** - Acesso total ao sistema
- **user** - Usuário padrão com permissões básicas

### Como funciona
- Todos os novos usuários recebem automaticamente a role `user`
- A role é incluída no JWT token e pode ser usada para autorização
- Para criar um admin, especifique `"role": "admin"` no body do POST

### Middleware de Autorização
O projeto utiliza o middleware `authorizeRoles()` para proteger rotas:

```javascript
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Apenas admin pode acessar
router.delete('/users/:id', authenticateToken, authorizeRoles('admin'), deleteUser);

// Admin ou moderador podem acessar
router.post('/posts', authenticateToken, authorizeRoles('admin', 'moderator'), createPost);
```

### Rotas Protegidas (Admin Only)
As seguintes rotas requerem role de admin:
- ✅ **POST /api/users** - Criar novo usuário
- ✅ **PATCH /api/users/:id/deactivate** - Inativar usuário
- ✅ **DELETE /api/users/:id** - Excluir usuário (soft/hard delete)
- ✅ **GET /api/vehicles/user/:userId** - Listar veículos de usuário específico
- ✅ **GET /api/maintenances/user/:userId** - Listar manutenções de usuário específico

### Mensagens de Erro
Quando um usuário sem permissão tenta acessar uma rota protegida:

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

## 📁 Estrutura do Projeto

```
src/
├── config/          # Configurações
│   ├── database.js      # Conexão PostgreSQL
│   ├── email.js         # Configuração de email (nodemailer)
│   └── initDb.js        # Inicialização do banco
├── controllers/     # Controladores
│   ├── userController.js            # CRUD de usuários + auth
│   ├── passwordResetController.js   # Reset de senha
│   ├── preferencesController.js     # Preferências do usuário
│   ├── vehicleController.js         # CRUD de veículos
│   └── maintenanceController.js     # CRUD de manutenções
├── middleware/      # Middlewares
│   ├── auth.js          # Autenticação JWT e autorização
│   ├── errorHandler.js  # Tratamento de erros
│   ├── rateLimiting.js  # Rate limiting para rotas
│   ├── requestLogger.js # Logging de requisições HTTP
│   └── validation.js    # Validação e sanitização de dados
├── migrations/      # Migrations do banco
├── routes/          # Rotas da API
│   ├── userRoutes.js       # Rotas de usuários
│   ├── passwordReset.js    # Rotas de reset de senha
│   ├── preferences.js      # Rotas de preferências
│   ├── vehicleRoutes.js    # Rotas de veículos
│   └── maintenanceRoutes.js # Rotas de manutenções
├── templates/       # Templates de email
│   └── passwordResetEmail.js  # Template de reset de senha
├── utils/           # Utilitários
│   ├── responses.js     # Respostas padronizadas
│   └── tokenGenerator.js  # Geração de tokens seguros
├── app.js          # Configuração do Express
└── server.js       # Inicialização do servidor
__tests__/          # Testes Jest
├── helpers/            # Funções auxiliares para testes
│   └── testUtils.js    # Helpers para gerar dados únicos
├── app.test.js         # Testes da aplicação
├── userRoutes.test.js  # Testes de rotas de usuários
├── authorization.test.js # Testes de autorização
├── passwordReset.test.js # Testes de reset de senha
├── preferences.test.js   # Testes de preferências
└── vehicleRoutes.test.js # Testes de rotas de veículos
scripts/            # Scripts utilitários (init-db, migrate)
.vscode/            # Configurações VS Code (debug)
Dockerfile          # Configuração Docker da aplicação
docker-compose.yml  # Orquestração dos serviços
```

## 🗄️ Estrutura da Tabela de Usuários

A tabela `users` possui uma estrutura completa com os seguintes campos:

### Identificação
- `id` - Chave primária (SERIAL)
- `first_name` - Primeiro nome (VARCHAR 50)
- `last_name` - Sobrenome (VARCHAR 50)
- `username` - Nome de usuário único (VARCHAR 30)
- `email` - Email único (VARCHAR 100)

### Segurança e Controle de Acesso
- `password_hash` - Hash da senha (VARCHAR 255)
- `role` - Role do usuário (admin/user) (VARCHAR 20)
- `email_verified` - Email verificado (BOOLEAN)
- `phone_verified` - Telefone verificado (BOOLEAN)
- `two_factor_enabled` - 2FA habilitado (BOOLEAN)
- `login_attempts` - Tentativas de login (INTEGER)
- `locked_until` - Bloqueado até (TIMESTAMP)
- `password_reset_token` - Token reset senha hasheado (VARCHAR 255)
- `password_reset_expires` - Expiração do token reset (TIMESTAMP)
- `email_verification_token` - Token verificação email (VARCHAR 255)
- `email_verification_expires` - Expiração do token verificação (TIMESTAMP)

### Perfil
- `phone` - Telefone (VARCHAR 20)
- `date_of_birth` - Data nascimento (DATE)
- `gender` - Gênero (VARCHAR 10)
- `profile_image_url` - URL da foto (VARCHAR 500)
- `bio` - Biografia (TEXT)
- `preferred_language` - Idioma preferido (VARCHAR 10)
- `timezone` - Fuso horário (VARCHAR 50)

### Controle
- `status` - Status do usuário (active/inactive/suspended/deleted)
- `last_login_at` - Último login (TIMESTAMP)
- `terms_accepted_at` - Termos aceitos em (TIMESTAMP)
- `privacy_policy_accepted_at` - Política aceita em (TIMESTAMP)
- `marketing_emails_consent` - Consentimento marketing (BOOLEAN)

### Auditoria
- `created_at` - Criado em (TIMESTAMP)
- `updated_at` - Atualizado em (TIMESTAMP) - Auto-atualizável
- `deleted_at` - Deletado em (TIMESTAMP) - Soft delete

## 🎨 Sistema de Preferências de Usuário

Cada usuário possui preferências personalizáveis automaticamente criadas no registro:

### Campos Disponíveis

#### Tema e Aparência
- **theme_mode** - Modo do tema: `'light'`, `'dark'`, ou `'system'` (segue SO) - Padrão: `'system'`
- **theme_color** - Cor primária do tema (string) - Padrão: `'blue'`

#### Interface
- **font_size** - Tamanho da fonte: `'small'`, `'medium'`, `'large'`, `'extra-large'` - Padrão: `'medium'`
- **compact_mode** - Modo compacto da interface (boolean) - Padrão: `false`
- **animations_enabled** - Habilitar animações (boolean) - Padrão: `true`

#### Acessibilidade
- **high_contrast** - Modo de alto contraste (boolean) - Padrão: `false`
- **reduce_motion** - Reduzir movimento/animações (boolean) - Padrão: `false`

### Estrutura da Tabela user_preferences

```sql
CREATE TABLE user_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE,
  theme_mode VARCHAR(20) DEFAULT 'system',
  theme_color VARCHAR(30) DEFAULT 'blue',
  font_size VARCHAR(20) DEFAULT 'medium',
  compact_mode BOOLEAN DEFAULT FALSE,
  animations_enabled BOOLEAN DEFAULT TRUE,
  high_contrast BOOLEAN DEFAULT FALSE,
  reduce_motion BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_preferences_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Comportamento

- ✅ **Criação Automática**: Preferências são criadas automaticamente ao registrar um novo usuário
- ✅ **Valores Padrão**: Todos os campos possuem valores padrão sensatos
- ✅ **Atualização Parcial**: Pode-se atualizar apenas campos específicos
- ✅ **Cascade Delete**: Preferências são excluídas automaticamente quando o usuário é removido

### Exemplo de Uso

```javascript
// Obter preferências do usuário autenticado
GET /api/preferences
Authorization: Bearer {token}

// Obter preferências de outro usuário (por ID)
GET /api/preferences/1
Authorization: Bearer {token}

// Atualizar tema para escuro (usuário autenticado)
PATCH /api/preferences/theme
Authorization: Bearer {token}
{
  "theme_mode": "dark",
  "theme_color": "purple"
}

// Atualizar múltiplas preferências (usuário autenticado)
PUT /api/preferences
Authorization: Bearer {token}
{
  "font_size": "large",
  "compact_mode": true,
  "animations_enabled": false
}

// Atualizar preferências de outro usuário
PUT /api/preferences/2
Authorization: Bearer {token}
{
  "theme_mode": "light",
  "theme_color": "green"
}

// Resetar preferências do usuário autenticado
DELETE /api/preferences
Authorization: Bearer {token}

// Resetar preferências de outro usuário
DELETE /api/preferences/3
Authorization: Bearer {token}
```

### Parâmetro de Rota userId

Todos os endpoints principais (`GET`, `PUT`, `DELETE`) aceitam um parâmetro opcional `userId` como parte da rota:
- **Se fornecido**: Opera nas preferências do usuário especificado (ex: `/api/preferences/5`)
- **Se omitido**: Opera nas preferências do usuário autenticado (via token JWT) (ex: `/api/preferences`)
- **Validação**: O `userId` deve ser um número inteiro válido

**Exemplo:**
```bash
# Próprias preferências
GET http://localhost:3000/api/preferences

# Preferências do usuário com ID 5
GET http://localhost:3000/api/preferences/5
```

## 🐳 Serviços Docker

O projeto inclui os seguintes serviços:

1. **API (Node.js)** - Porta 3001 (externa) / 3000 (interna)
2. **PostgreSQL** - Porta 5432
3. **PgAdmin** - Porta 8080 (Interface web para PostgreSQL)

## 🔧 Tecnologias Utilizadas

- **Backend:** Node.js, Express
- **Banco:** PostgreSQL, pg (driver)
- **Autenticação:** JWT (jsonwebtoken)
- **Segurança:** bcrypt/bcryptjs para hash de senhas, Helmet, express-rate-limit, express-validator, hpp, csrf-csrf, cookie-parser
- **Email:** nodemailer (com suporte Ethereal/Gmail/SMTP)
- **Testes:** Jest, Supertest
- **Logging:** Winston com rotação automática de arquivos
- **Infraestrutura:** Docker, Docker Compose
- **Desenvolvimento:** nodemon (hot-reload), dotenv

## 🧪 Sistema de Testes

O projeto possui uma suíte completa de testes automatizados com **Jest** e **Supertest**.

### Executar Testes

```bash
# Executar todos os testes
npm test

# Executar em modo watch (auto-reload)
npm run test:watch

# Executar com relatório de cobertura
npm test -- --coverage
```

### Estatísticas dos Testes

```
✅ Test Suites: 6 passed, 6 total
✅ Tests:       143 passed, 143 total
⏱️  Time:        ~15s
```

### Cobertura de Testes

Os testes cobrem todas as funcionalidades principais da API:

- ✅ **Autenticação**: Registro, login, logout, refresh token
- ✅ **Autorização**: Sistema RBAC, permissões por role (admin/user)
- ✅ **CRUD de Usuários**: Criar, listar, buscar, atualizar, deletar
- ✅ **Reset de Senha**: Solicitar, validar token, redefinir senha
- ✅ **Preferências**: Obter, atualizar, resetar preferências de usuário
- ✅ **CRUD de Veículos**: Criar, listar, buscar, atualizar, inativar, deletar
- ✅ **CRUD de Manutenções**: Criar, listar, buscar, atualizar, marcar como concluída, deletar
- ✅ **Validações**: Dados inválidos, usuários inexistentes, autenticação

### Helpers de Teste

O projeto inclui funções auxiliares para gerar dados únicos e evitar conflitos:

```javascript
const { generateTestUsername, generateTestEmail } = require('./helpers/testUtils');

// Gerar username único (máx 30 caracteres)
const username = generateTestUsername('admin'); // admin_420123_45

// Gerar email único
const email = generateTestEmail('test'); // test_1732113420123_456@test.com
```

### Características dos Testes

1. **Dados Únicos**: Cada teste gera usernames e emails únicos usando timestamps
2. **Isolamento**: Testes criam e limpam seus próprios dados
3. **Rate Limiting Desabilitado**: Middleware detecta `NODE_ENV=test` automaticamente
4. **Setup/Teardown**: Uso de `beforeAll`/`afterAll` para preparar ambiente
5. **Limpeza Automática**: Dados de teste são removidos após execução

### Arquivos de Teste

| Arquivo | Descrição | Testes |
|---------|-----------|--------|
| `app.test.js` | Testes básicos da aplicação | Rotas básicas, health check |
| `userRoutes.test.js` | Testes de rotas de usuários | CRUD, autenticação, validações |
| `authorization.test.js` | Testes de autorização RBAC | Permissões admin, acesso negado |
| `passwordReset.test.js` | Testes de reset de senha | Solicitar, validar, redefinir |
| `preferences.test.js` | Testes de preferências | Obter, atualizar, resetar |
| `vehicleRoutes.test.js` | Testes de rotas de veículos | CRUD completo, admin endpoints |

### Exemplo de Teste

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

### Configuração Jest

O Jest está configurado para:
- Ambiente Node.js
- Ignorar arquivos helper (`__tests__/helpers/`)
- Coletar cobertura de código em `src/**/*.js`
- Gerar relatórios em HTML, LCOV e texto

## 🐛 Debug

### Opção 1: Ver logs do Docker
```bash
npm run docker:logs
```

### Opção 2: Debug local com VS Code
1. Pare o Docker: `npm run docker:down`
2. Pressione `F5` no VS Code
3. Escolha "Debug Local"
4. Coloque breakpoints no código

### Opção 3: Debug no Docker
1. Altere `docker-compose.yml` linha 46: `command: npm run dev:debug`
2. Reinicie: `npm run docker:down && npm run docker:up`
3. Pressione `F5` no VS Code e escolha "Debug Docker"

## 🔐 Segurança Implementada

### Autenticação e Autorização
- ✅ Hash de senhas com bcrypt (salt rounds: 10)
- ✅ Autenticação JWT (access + refresh tokens)
- ✅ Sistema de roles (admin/user)
- ✅ **Middleware de autorização por role (RBAC)**
- ✅ Middleware de autenticação para rotas protegidas
- ✅ Tokens JWT com expiração configurável
- ✅ Tokens de reset de senha hasheados (SHA256) com expiração (30 minutos)

### Proteção contra Ataques
- ✅ **Helmet** - Headers de segurança HTTP
  - Proteção XSS, clickjacking, MIME sniffing
  - Content Security Policy (CSP)
  - HSTS (HTTP Strict Transport Security)
- ✅ **Rate Limiting** - Proteção contra ataques DDoS/brute force
  - Limites gerais: 100 req/15min por IP
  - Autenticação: 5 tentativas/15min
  - Reset de senha: 3 tentativas/1h
- ✅ **HPP (HTTP Parameter Pollution)** - Proteção contra poluição de parâmetros
  - Previne ataques com múltiplos parâmetros duplicados
  - Mantém apenas o último valor de parâmetros duplicados
  - Suporte a whitelist para parâmetros que devem aceitar arrays
- ✅ **CSRF Protection** - Proteção contra Cross-Site Request Forgery
  - Double Submit Cookie pattern
  - Tokens CSRF para requisições de mutação (POST, PUT, DELETE, PATCH)
  - Cookie httpOnly, sameSite strict e secure em produção
  - Endpoint `/api/csrf-token` para obter tokens
  - Desabilitado em ambiente de teste
- ✅ Proteção contra brute force (bloqueio após 5 tentativas por 15 minutos)
- ✅ Proteção contra enumeração de usuários (mensagens genéricas)

### Gerenciamento de Dados
- ✅ **Validação e sanitização de entrada de dados (express-validator)**
- ✅ Soft delete de usuários
- ✅ Hard delete para remoção permanente de usuários (admin only)

### Logging e Auditoria
- ✅ **Winston** - Sistema de logging profissional
  - Logs de requisições HTTP
  - Logs de erros e warnings
  - Rotação automática de arquivos
  - Logs de violações de rate limit

## ✅ Sistema de Validação e Sanitização

O sistema implementa validação e sanitização robusta usando **express-validator** em todos os endpoints da API.

### Características

- ✅ **Validação de tipos** - Verifica tipos de dados (string, number, boolean, date)
- ✅ **Validação de comprimento** - Limites mínimos e máximos para campos
- ✅ **Validação de formato** - Regex para emails, usernames, telefones, etc.
- ✅ **Validação de enums** - Valores permitidos (roles, theme_mode, font_size, etc.)
- ✅ **Sanitização XSS** - Remove/escapa caracteres perigosos
- ✅ **Normalização** - Padroniza emails, remove espaços, etc.
- ✅ **Mensagens contextualizadas** - Erros específicos por tipo de validação

### Validações Implementadas

#### Registro de Usuário (`validateRegister`)
```javascript
// Campos validados
- first_name: 2-50 caracteres, apenas letras
- last_name: 2-50 caracteres, apenas letras
- username: 3-30 caracteres, alfanumérico + underscore
- email: formato válido, normalizado, max 100 caracteres
- password: mínimo 6 caracteres
- role: opcional, deve ser 'admin' ou 'user'
```

#### Login (`validateLogin`)
```javascript
- login: 3-100 caracteres (username ou email)
- password: obrigatório
```

#### Atualização de Perfil (`validateUpdateProfile`)
```javascript
- first_name: opcional, 2-50 caracteres, apenas letras
- last_name: opcional, 2-50 caracteres, apenas letras
- phone: opcional, formato de telefone válido, max 20 caracteres
- date_of_birth: opcional, data ISO8601 válida
- gender: opcional, valores: 'male', 'female', 'other', 'prefer_not_to_say'
- bio: opcional, max 500 caracteres
- preferred_language: opcional, formato: 'pt-BR', 'en-US', etc.
- timezone: opcional, max 50 caracteres
```

#### Reset de Senha (`validatePasswordReset`)
```javascript
- token: obrigatório, mínimo 10 caracteres
- newPassword: obrigatório, mínimo 6 caracteres
```

#### Preferências (`validatePreferences`)
```javascript
- theme_mode: opcional, valores: 'light', 'dark', 'system'
- theme_color: opcional, max 30 caracteres, formato cor válido
- font_size: opcional, valores: 'small', 'medium', 'large', 'extra-large'
- compact_mode: opcional, boolean
- animations_enabled: opcional, boolean
- high_contrast: opcional, boolean
- reduce_motion: opcional, boolean
```

#### ID de Usuário (`validateUserId`)
```javascript
- id: parâmetro de rota, deve ser inteiro positivo (>= 1)
```

### Sanitização Aplicada

Todos os campos de texto passam por sanitização:
- **trim()** - Remove espaços no início e fim
- **escape()** - Escapa caracteres HTML especiais (<, >, &, ', ", /)
- **normalizeEmail()** - Padroniza formato de email (lowercase, remove dots no Gmail)

### Formato de Resposta de Erro

Quando uma validação falha, a API retorna:

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

O sistema retorna mensagens de erro diferentes dependendo do contexto:

- **Múltiplos campos obrigatórios faltando**: `"Campos obrigatórios não fornecidos"`
- **Validação de preferências**: `"Validação falhou"` com detalhes do campo
- **ID inválido**: `"ID do usuário inválido"`
- **Erro específico único**: Retorna a mensagem específica da validação

### Exemplo de Uso

```javascript
// Requisição com dados inválidos
POST /api/users/register
{
  "first_name": "J",           // Muito curto (mín 2)
  "last_name": "123",          // Contém números
  "username": "ab",            // Muito curto (mín 3)
  "email": "invalid-email",    // Formato inválido
  "password": "123"            // Muito curto (mín 6)
}

// Resposta
{
  "error": "Primeiro nome deve ter entre 2 e 50 caracteres",
  "message": "Primeiro nome deve ter entre 2 e 50 caracteres",
  "details": [
    {
      "field": "first_name",
      "message": "Primeiro nome deve ter entre 2 e 50 caracteres",
      "value": "J"
    },
    {
      "field": "last_name",
      "message": "Sobrenome deve conter apenas letras",
      "value": "123"
    },
    // ... mais erros
  ]
}
```

### Rotas Protegidas com Validação

Todas as rotas da API utilizam validação:
- ✅ 11 validações em `userRoutes.js`
- ✅ 3 validações em `passwordReset.js`
- ✅ 5 validações em `preferences.js`
- ✅ 8 validações em `vehicleRoutes.js`
- ✅ 6 validações em `maintenanceRoutes.js`

### Proteção Contra Ataques

A validação protege contra:
- ✅ **XSS (Cross-Site Scripting)** - Escape de HTML
- ✅ **SQL Injection** - Validação de tipos e sanitização
- ✅ **NoSQL Injection** - Validação de tipos
- ✅ **Buffer Overflow** - Limites de comprimento
- ✅ **CSRF** - Validação de tokens e formatos

## 🗃️ Sistema de Migrations

O projeto inclui um sistema completo de migrations para gerenciar mudanças no banco de dados:

### Características
- ✅ Controle de versão do banco de dados
- ✅ Rastreamento de migrations executadas
- ✅ Suporte a rollback (reverter migrations)
- ✅ Tabela `migrations` para controle
- ✅ Comandos simples via npm scripts

### Criar uma nova migration
1. Crie um arquivo em `src/migrations/` seguindo o padrão: `XXX_descricao.js`
2. Implemente as funções `up()` e `down()`
3. Execute com `npm run migrate:up`

### Exemplo de migration
```javascript
const pool = require('../config/database');

const up = async () => {
  await pool.query(`
    ALTER TABLE users
    ADD COLUMN new_field VARCHAR(100)
  `);
};

const down = async () => {
  await pool.query(`
    ALTER TABLE users
    DROP COLUMN new_field
  `);
};

module.exports = { up, down };
```

## 📧 Sistema de Reset de Senha

O sistema implementa recuperação de senha via email com segurança robusta:

### Funcionalidades
- ✅ Envio de email com link de reset
- ✅ Tokens seguros hasheados (SHA256)
- ✅ Expiração de tokens (30 minutos)
- ✅ Uso único de tokens
- ✅ Template HTML responsivo
- ✅ Suporte a Ethereal (dev) e SMTP (prod)

### Fluxo de Uso
1. **Solicitar reset:** `POST /api/password-reset/request` com `{ "email": "..." }`
2. **Receber email** com link e token
3. **Redefinir senha:** `POST /api/password-reset/reset` com `{ "token": "...", "newPassword": "..." }`

### Configuração de Email

#### Desenvolvimento (Ethereal - Teste)
O sistema usa automaticamente o Ethereal Email para testes. O link de preview aparece no console.

#### Produção (Gmail)
1. Ative verificação em duas etapas no Google
2. Gere senha de aplicativo: https://myaccount.google.com/apppasswords
3. Configure no `.env`:
```env
NODE_ENV=production
EMAIL_USER=seu-email@gmail.com
EMAIL_PASSWORD=sua-senha-de-aplicativo
```

## 📚 Documentação da API

A documentação interativa completa está disponível via Swagger UI:
- **Local**: http://localhost:3000/api-docs
- **Docker**: http://localhost:3001/api-docs
- **JSON**: http://localhost:3000/api-docs.json

## 🚀 Próximos Passos

### Funcionalidades Concluídas
1. ~~Implementar autenticação JWT~~ ✅
2. ~~Adicionar middleware de autorização~~ ✅
3. ~~Criar endpoints de login/logout~~ ✅
4. ~~Implementar sistema de roles (admin, user)~~ ✅
5. ~~Sistema de migrations~~ ✅
6. ~~Implementar reset de senha por email~~ ✅
7. ~~Implementar middleware de autorização por role (RBAC)~~ ✅
8. ~~Implementar endpoints de exclusão e inativação de usuários~~ ✅
9. ~~Documentar API com Swagger~~ ✅
10. ~~Implementar sistema de preferências de usuário~~ ✅
11. ~~Sistema de logging profissional com Winston~~ ✅

### Segurança (Próxima Prioridade)
12. ~~**Implementar Helmet**~~ ✅ - Headers de segurança HTTP
    - ✅ Proteção XSS, clickjacking, MIME sniffing
    - ✅ Content Security Policy (CSP)
    - ✅ HSTS (HTTP Strict Transport Security)
    - Implementado com `helmet`

13. ~~**Implementar Rate Limiting**~~ ✅ - Proteção contra ataques DDoS/brute force
    - ✅ Limitar requisições por IP (100 req/15min)
    - ✅ Limitar tentativas de login (5 req/15min)
    - ✅ Rate limit para reset de senha (3 req/1h)
    - ✅ Rate limit diferenciado por rota
    - Implementado com `express-rate-limit`

14. ~~**Implementar Validação e Sanitização de Dados**~~ ✅
    - ✅ Validação robusta de inputs com `express-validator`
    - ✅ Sanitização contra XSS (trim, escape, normalizeEmail)
    - ✅ Validações específicas por tipo de campo
    - ✅ Mensagens de erro contextualizadas
    - ✅ Validação de tipos, comprimentos, formatos e enums

15. ~~**Implementar proteção HTTP Parameter Pollution (HPP)**~~ ✅
    - ✅ Proteção contra poluição de parâmetros
    - ✅ Prevenir arrays maliciosos em query strings
    - ✅ Mantém apenas o último valor de parâmetros duplicados
    - ✅ Suporte a whitelist para parâmetros que devem aceitar arrays
    - Implementado com `hpp`

16. ~~**Implementar CSRF Protection**~~ ✅
    - ✅ Proteção contra Cross-Site Request Forgery
    - ✅ Double Submit Cookie pattern
    - ✅ Tokens CSRF para requisições de mutação (POST, PUT, DELETE, PATCH)
    - ✅ Cookie httpOnly, sameSite strict e secure em produção
    - ✅ Endpoint GET /api/csrf-token para obter tokens
    - ✅ Desabilitado em ambiente de teste (NODE_ENV=test)
    - Implementado com `csrf-csrf` e `cookie-parser`

### Funcionalidades Adicionais
17. Implementar verificação de email
18. Adicionar upload de imagem de perfil (com validação e limite de tamanho)
19. Implementar 2FA (Two-Factor Authentication)
20. Adicionar logs de auditoria para ações críticas
21. Implementar política de senha forte (complexidade mínima)
22. Adicionar notificação de login suspeito
23. Implementar sessões de usuário com revogação

## 📱 Integração WhatsApp (Planejada)

### Funcionalidade de Notificações via WhatsApp

O projeto terá integração com WhatsApp para notificações automáticas do sistema de manutenção de veículos.

#### 🎯 **Objetivo**
- Enviar lembretes automáticos de manutenção via WhatsApp
- Notificar sobre vencimentos de documentos (IPVA, licenciamento)
- Confirmar agendamentos e serviços realizados

#### 🛠️ **Tecnologia Escolhida: WPPConnect**

**Por que WPPConnect?**
- ✅ **Gratuito**: Open source (MIT License)
- ✅ **Brasileiro**: Comunidade e suporte em português
- ✅ **API REST**: Fácil integração com backend Node.js
- ✅ **Multi-sessão**: Suporte a múltiplas instâncias WhatsApp
- ✅ **Completo**: Suporte a texto, imagens, documentos
- ✅ **Ativo**: Desenvolvimento constante

#### 📋 **Funcionalidades Planejadas**

##### **1. Lembretes de Manutenção**
```javascript
// Exemplo de lembrete automático
🚗 *LEMBRETE DE MANUTENÇÃO*

📋 *Veículo:* Toyota Corolla (ABC-1234)
⚙️ *Serviço:* Troca de Óleo
📍 *KM Atual:* 95.000 km
📅 *KM Recomendado:* 100.000 km
⏰ *Prazo:* Próximos 5.000 km

🏪 Não esqueça de agendar seu serviço!
```

##### **2. Alertas de Documentos**
```javascript
// Notificação de documentos
📋 *ALERTA DE DOCUMENTAÇÃO*

🚗 *Veículo:* Honda Civic (XYZ-5678)
📄 *Documento:* IPVA 2024
📅 *Vencimento:* 28/02/2024
⚠️ *Status:* Vence em 15 dias!

💡 Acesse o sistema para mais detalhes
```

##### **3. Confirmação de Serviços**
```javascript
// Comprovante de manutenção
✅ *MANUTENÇÃO CONCLUÍDA*

🔧 *Serviço:* Revisão Geral
💰 *Valor:* R$ 450,00
📅 *Data:* 15/11/2024
🏪 *Oficina:* Auto Center Silva

📎 *Comprovante anexo*
```

#### 🔧 **Integração Técnica**

##### **Instalação**
```bash
npm install @wppconnect-team/wppconnect
```

##### **Estrutura Planejada**
```javascript
// services/whatsappService.js
class WhatsAppNotificationService {
  async sendMaintenanceReminder(userPhone, vehicle, reminder) {
    // Integração com a view pending_reminders do sistema
  }
  
  async sendDocumentAlert(userPhone, vehicle, document) {
    // Alertas de documentos vencidos
  }
  
  async sendServiceConfirmation(userPhone, maintenance) {
    // Confirmação de serviços realizados
  }
}
```

##### **Integração com Migrations Existentes**
O sistema utilizará as migrations já implementadas:
- `pending_reminders` - View para alertas pendentes
- `vehicle_statistics` - Estatísticas dos veículos
- Sistema de triggers automáticos para notificações

#### ⚡ **Implementação Futura**

##### **Fase 1: Configuração Básica**
- [ ] Setup do WPPConnect
- [ ] Conexão e autenticação WhatsApp Web
- [ ] Serviço básico de envio de mensagens

##### **Fase 2: Lembretes de Manutenção**
- [ ] Cron job para verificar lembretes pendentes
- [ ] Templates de mensagens para cada tipo de manutenção
- [ ] Integração com sistema de triggers do banco

##### **Fase 3: Alertas de Documentos**
- [ ] Sistema de alertas de IPVA, licenciamento
- [ ] Notificações 30/15/7 dias antes do vencimento
- [ ] Templates específicos por tipo de documento

##### **Fase 4: Confirmações e Comprovantes**
- [ ] Webhook para confirmação de serviços
- [ ] Envio de comprovantes (imagens/PDFs)
- [ ] Histórico de notificações enviadas

#### 🔒 **Considerações de Segurança**
- Validação de números de telefone
- Rate limiting para evitar spam
- Consentimento explícito para notificações
- Backup de tokens de sessão WhatsApp
- Monitoramento de falhas de envio

#### 📱 **Configurações Necessárias**

##### **Variáveis de Ambiente (.env)**
```bash
# WhatsApp Configuration
WHATSAPP_ENABLED=true
WHATSAPP_SESSION_NAME=vehicle-system
WHATSAPP_HEADLESS=true
WHATSAPP_WEBHOOK_URL=http://localhost:3000/webhook/whatsapp

# Notification Settings
NOTIFICATION_DEFAULT_ENABLED=true
NOTIFICATION_MAINTENANCE_DAYS_BEFORE=7
NOTIFICATION_DOCUMENT_DAYS_BEFORE=30,15,7
```

##### **Docker Support**
```yaml
# docker-compose.yml (extensão futura)
services:
  wppconnect:
    image: wppconnect/wppconnect-server
    ports:
      - "21465:21465"
    environment:
      - SECRET_KEY=${WHATSAPP_SECRET_KEY}
    volumes:
      - ./data/whatsapp:/app/tokens
```

#### 🚀 **Como será ativado**
1. Configurar número WhatsApp dedicado
2. Executar setup inicial: `npm run setup:whatsapp`
3. Escanear QR Code para autenticação
4. Configurar templates de mensagens
5. Ativar cron jobs para verificação automática

#### 💡 **Benefícios Esperados**
- **Maior engajamento**: Lembretes diretos no celular
- **Redução de custos**: Sem SMS, apenas dados/WiFi
- **Praticidade**: Não precisa abrir app ou email
- **Automação**: Sistema 100% automatizado
- **Personalização**: Mensagens específicas por veículo

### Recomendações de Pacotes de Segurança

| Pacote | Finalidade | Prioridade |
|--------|-----------|-----------|
| `helmet` | Headers de segurança HTTP | 🔴 Alta |
| `express-rate-limit` | Rate limiting básico | 🔴 Alta |
| `express-validator` | Validação e sanitização | 🔴 Alta |
| `hpp` | Proteção parameter pollution | 🟡 Média |
| `csurf` ou `csrf-csrf` | Proteção CSRF | 🟡 Média |
| `rate-limit-redis` | Rate limit escalável | 🟢 Baixa (produção) |
| `express-mongo-sanitize` | Sanitização NoSQL injection | 🟢 Baixa (se usar MongoDB) |