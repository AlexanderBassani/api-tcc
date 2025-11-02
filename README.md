# API Node.js com Express, JWT, TypeORM e PostgreSQL

Uma API RESTful construída com Node.js, Express, TypeORM, autenticação JWT, Jest para testes e PostgreSQL como banco de dados, com suporte completo a Docker e hot-reload.

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
│   ├── database.js      # TypeORM DataSource (conexão PostgreSQL)
│   ├── email.js         # Configuração de email (nodemailer)
│   ├── initDb.js        # Inicialização do banco
│   ├── logger.js        # Sistema de logging (Winston)
│   └── swagger.js       # Configuração Swagger
├── controllers/     # Controladores
│   ├── userController.js            # CRUD de usuários + auth
│   ├── passwordResetController.js   # Reset de senha
│   └── preferencesController.js     # Preferências do usuário
├── entities/        # Entidades TypeORM
│   ├── User.js              # Entidade User (EntitySchema)
│   └── UserPreferences.js   # Entidade UserPreferences (EntitySchema)
├── middleware/      # Middlewares
│   ├── auth.js          # Autenticação JWT + RBAC
│   ├── errorHandler.js  # Tratamento de erros
│   └── requestLogger.js # Logger de requisições HTTP
├── migrations/      # Migrations do banco (SQL)
├── routes/          # Rotas da API
│   ├── userRoutes.js       # Rotas de usuários
│   ├── passwordReset.js    # Rotas de reset de senha
│   └── preferences.js      # Rotas de preferências
├── templates/       # Templates de email
│   └── passwordResetEmail.js  # Template de reset de senha
├── utils/           # Utilitários
│   ├── repositories.js    # Helper para repositórios TypeORM
│   ├── responses.js       # Respostas padronizadas
│   └── tokenGenerator.js  # Geração de tokens seguros
├── app.js          # Configuração do Express
└── server.js       # Inicialização do servidor + TypeORM
__tests__/          # Testes Jest
scripts/            # Scripts utilitários (init-db, migrate)
logs/               # Arquivos de log (Winston) - gitignored
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
- **ORM:** TypeORM (EntitySchema pattern)
- **Banco:** PostgreSQL
- **Autenticação:** JWT (jsonwebtoken)
- **Segurança:** bcrypt/bcryptjs para hash de senhas
- **Email:** nodemailer (com suporte Ethereal/Gmail/SMTP)
- **Testes:** Jest, Supertest
- **Infraestrutura:** Docker, Docker Compose
- **Desenvolvimento:** nodemon (hot-reload), dotenv, reflect-metadata

## 🏗️ Arquitetura TypeORM

Este projeto utiliza **TypeORM** como camada de abstração do banco de dados, facilitando operações com PostgreSQL e permitindo futuras migrações para outros bancos de dados.

### Por que TypeORM?

- ✅ **Abstração de banco de dados** - Facilita migração entre diferentes SGBDs
- ✅ **Repository Pattern** - Acesso limpo e organizado aos dados
- ✅ **Query Builder** - Queries complexas de forma type-safe
- ✅ **Migrations integradas** - Controle de versão do schema
- ✅ **Relacionamentos automáticos** - Join automático entre entidades
- ✅ **Performance** - Pool de conexões otimizado

### EntitySchema Pattern

O projeto usa **EntitySchema** ao invés de decorators, permitindo uso com JavaScript puro sem necessidade de TypeScript:

```javascript
// src/entities/User.js
const { EntitySchema } = require('typeorm');

const User = new EntitySchema({
  name: 'User',
  tableName: 'users',
  columns: {
    id: { type: 'int', primary: true, generated: true },
    firstName: { type: 'varchar', length: 50, name: 'first_name' },
    email: { type: 'varchar', length: 100, unique: true },
    // ... outros campos
  },
  relations: {
    preferences: {
      type: 'one-to-one',
      target: 'UserPreferences',
      cascade: true
    }
  }
});
```

### DataSource (Conexão)

```javascript
// src/config/database.js
const { DataSource } = require('typeorm');

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'api_db',
  synchronize: false, // Nunca use true em produção!
  logging: false,
  entities: [__dirname + '/../entities/**/*.js'],
  migrations: [],
});
```

### Repository Pattern

O projeto usa helpers para acesso aos repositórios:

```javascript
// src/utils/repositories.js
const getUserRepository = () => AppDataSource.getRepository('User');
const getUserPreferencesRepository = () => AppDataSource.getRepository('UserPreferences');

// Uso nos controllers
const userRepo = getUserRepository();
const user = await userRepo.findOne({ where: { id: 1 } });
```

### Tipos de Queries

#### 1. Queries Simples (Repository Methods)
```javascript
// Buscar por ID
const user = await userRepo.findOne({ where: { id: userId } });

// Buscar com condições
const user = await userRepo.findOne({
  where: { email: 'user@example.com', status: 'active' }
});

// Listar todos
const users = await userRepo.find();

// Criar e salvar
const user = userRepo.create({ firstName: 'João', email: 'joao@example.com' });
await userRepo.save(user);

// Atualizar
await userRepo.update({ id: 1 }, { firstName: 'João Silva' });

// Soft delete
await userRepo.softDelete({ id: 1 });

// Hard delete
await userRepo.delete({ id: 1 });
```

#### 2. Queries Complexas (Query Builder)
```javascript
// Login com username OU email
const user = await userRepo.createQueryBuilder('user')
  .where('(user.username = :login OR user.email = :login)', { login })
  .andWhere('user.deletedAt IS NULL')
  .select(['user.id', 'user.passwordHash', 'user.email'])
  .getOne();

// Busca com paginação
const [users, total] = await userRepo.createQueryBuilder('user')
  .where('user.status = :status', { status: 'active' })
  .skip(skip)
  .take(limit)
  .getManyAndCount();
```

#### 3. Raw SQL (QueryRunner)
```javascript
// Para operações especiais (triggers, functions, etc)
const queryRunner = AppDataSource.createQueryRunner();
await queryRunner.query(`
  CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
`);
await queryRunner.release();
```

### Entidades Disponíveis

#### User (src/entities/User.js)
- 42 campos incluindo: id, firstName, lastName, username, email, passwordHash, role, status, etc.
- Relacionamento one-to-one com UserPreferences
- Soft delete habilitado (campo deletedAt)

#### UserPreferences (src/entities/UserPreferences.js)
- 10 campos de preferências de interface e tema
- Foreign key para User (userId)
- Cascade delete automático

### Migrations

Atualmente as migrations estão desabilitadas no TypeORM (`migrations: []`), pois o projeto usa migrations SQL manuais em `src/migrations/`. No futuro, pode-se migrar para migrations TypeORM:

```javascript
// Exemplo de migration TypeORM (futuro)
class AddPhoneToUser1234567890 {
  async up(queryRunner) {
    await queryRunner.query(`ALTER TABLE users ADD phone VARCHAR(20)`);
  }

  async down(queryRunner) {
    await queryRunner.query(`ALTER TABLE users DROP COLUMN phone`);
  }
}
```

### Benefícios da Migração para TypeORM

✅ **Concluído:**
- 100% dos controllers migrados (userController, passwordResetController, preferencesController)
- Scripts de inicialização migrados (init-db.js)
- Pool de conexões gerenciado automaticamente
- Queries SQL substituídas por repository methods
- Relacionamentos entre entidades funcionando
- Testes validados (login, profile, preferences)

🎯 **Próximos Passos:**
- Migrar tests para usar repositories TypeORM
- Converter migrations SQL para migrations TypeORM
- Adicionar mais entidades conforme necessário

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

- ✅ Hash de senhas com bcrypt (salt rounds: 10)
- ✅ Autenticação JWT (access + refresh tokens)
- ✅ Sistema de roles (admin/user)
- ✅ **Middleware de autorização por role (RBAC)**
- ✅ Proteção contra brute force (bloqueio após 5 tentativas por 15 minutos)
- ✅ Validação de entrada de dados
- ✅ Soft delete de usuários
- ✅ Tokens JWT com expiração configurável
- ✅ Tokens de reset de senha hasheados (SHA256)
- ✅ Tokens de reset com expiração (30 minutos)
- ✅ Middleware de autenticação para rotas protegidas
- ✅ Proteção contra enumeração de usuários (mensagens genéricas)
- ✅ Hard delete para remoção permanente de usuários (admin only)

## 🗃️ Sistema de Migrations

O projeto inclui um sistema completo de migrations SQL para gerenciar mudanças no banco de dados:

### Características
- ✅ Controle de versão do banco de dados
- ✅ Rastreamento de migrations executadas
- ✅ Suporte a rollback (reverter migrations)
- ✅ Tabela `migrations` para controle
- ✅ Comandos simples via npm scripts

### Status Atual: Migrations SQL

Atualmente o projeto usa **migrations SQL manuais** localizadas em `src/migrations/`. As migrations TypeORM estão desabilitadas (`migrations: []` no DataSource).

### Criar uma nova migration
1. Crie um arquivo em `src/migrations/` seguindo o padrão: `XXX_descricao.js`
2. Implemente as funções `up()` e `down()` usando QueryRunner
3. Execute com `npm run migrate:up`

### Exemplo de migration
```javascript
const AppDataSource = require('../config/database');

const up = async () => {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();

  await queryRunner.query(`
    ALTER TABLE users
    ADD COLUMN new_field VARCHAR(100)
  `);

  await queryRunner.release();
};

const down = async () => {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();

  await queryRunner.query(`
    ALTER TABLE users
    DROP COLUMN new_field
  `);

  await queryRunner.release();
};

module.exports = { up, down };
```

### Migração futura para TypeORM Migrations

No futuro, as migrations podem ser convertidas para o formato nativo do TypeORM. Veja mais detalhes na seção "Arquitetura TypeORM".

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
12. ~~Migrar para TypeORM (Entity Schema pattern)~~ ✅

### Segurança (Próxima Prioridade)
13. **Implementar Helmet** - Headers de segurança HTTP
    - Proteção XSS, clickjacking, MIME sniffing
    - Content Security Policy (CSP)
    - HSTS (HTTP Strict Transport Security)
    - Pacote: `helmet`

14. **Implementar Rate Limiting** - Proteção contra ataques DDoS/brute force
    - Limitar requisições por IP
    - Limitar tentativas de login
    - Rate limit diferenciado por rota
    - Pacotes: `express-rate-limit` + `rate-limit-redis` (para produção escalável)

15. **Implementar Validação e Sanitização de Dados**
    - Validação robusta de inputs
    - Sanitização contra XSS
    - Prevenção de SQL/NoSQL Injection
    - Pacote: `express-validator` (recomendado) ou `joi`

16. **Implementar proteção HTTP Parameter Pollution (HPP)**
    - Proteção contra poluição de parâmetros
    - Prevenir arrays maliciosos em query strings
    - Pacote: `hpp`

17. **Implementar CSRF Protection**
    - Proteção contra Cross-Site Request Forgery
    - Tokens CSRF para formulários
    - Pacote: `csurf` ou `csrf-csrf`

### Funcionalidades Adicionais
18. Implementar verificação de email
19. Adicionar upload de imagem de perfil (com validação e limite de tamanho)
20. Implementar 2FA (Two-Factor Authentication)
21. Adicionar logs de auditoria para ações críticas
22. Implementar política de senha forte (complexidade mínima)
23. Adicionar notificação de login suspeito
24. Implementar sessões de usuário com revogação

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