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
  - `server.js` - Inicialização do servidor + TypeORM DataSource
  - `config/` - Configurações
    - `database.js` - TypeORM DataSource (conexão PostgreSQL)
    - `initDb.js` - Inicialização do banco com TypeORM
    - `swagger.js` - Configuração Swagger
    - `logger.js` - Sistema de logging Winston
    - `email.js` - Configuração de email (nodemailer)
  - `entities/` - Entidades TypeORM (EntitySchema)
    - `User.js` - Entidade User (42 campos)
    - `UserPreferences.js` - Entidade UserPreferences (10 campos)
  - `controllers/` - Controladores das rotas (migrados para TypeORM)
    - `userController.js` - CRUD de usuários e autenticação
    - `passwordResetController.js` - Reset de senha
    - `preferencesController.js` - Preferências de usuário
  - `routes/` - Definição das rotas
    - `userRoutes.js` - Rotas de usuários
    - `passwordReset.js` - Rotas de reset de senha
    - `preferences.js` - Rotas de preferências
  - `middleware/` - Middlewares
    - `auth.js` - Autenticação JWT + RBAC
    - `errorHandler.js` - Tratamento de erros
    - `requestLogger.js` - Logger de requisições HTTP
  - `templates/` - Templates de email
  - `utils/` - Utilitários
    - `repositories.js` - Helpers para repositórios TypeORM
    - `responses.js` - Respostas padronizadas
    - `tokenGenerator.js` - Geração de tokens seguros
- `__tests__/` - Testes Jest
- `scripts/` - Scripts utilitários
  - `init-db.js` - Inicialização do banco (TypeORM)
  - `migrate.js` - Sistema de migrations
- `migrations/` - Arquivos SQL de migrations
- `logs/` - Arquivos de log gerados pelo winston (gitignored)

## Tecnologias Utilizadas

- **Node.js** - Runtime JavaScript
- **Express** - Framework web
- **TypeORM** - ORM (Object-Relational Mapping) com EntitySchema pattern
- **reflect-metadata** - Necessário para TypeORM
- **PostgreSQL** - Banco de dados
- **Jest** - Framework de testes
- **Supertest** - Testes de API
- **dotenv** - Gerenciamento de variáveis de ambiente
- **cors** - Middleware para Cross-Origin Resource Sharing
- **jsonwebtoken** - Autenticação JWT
- **bcryptjs** - Hash de senhas
- **nodemailer** - Envio de emails
- **swagger** - Documentação da API
- **winston** - Sistema de logging profissional
- **winston-daily-rotate-file** - Rotação automática de arquivos de log

## Configuração do Banco

O projeto usa **TypeORM** com PostgreSQL. As configurações ficam no `.env`:
- Host: localhost
- Porta: 5432
- Banco: api_db
- Usuário: postgres
- Senha: password

### TypeORM DataSource
O DataSource é configurado em `src/config/database.js` e inicializado automaticamente no `src/server.js` antes do servidor Express iniciar.

```javascript
const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'api_db',
  synchronize: false, // NUNCA use true em produção
  logging: false,
  entities: [__dirname + '/../entities/**/*.js'],
  migrations: [], // Migrations TypeORM desabilitadas (usando SQL manual)
});
```

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

## Trabalhando com TypeORM

Este projeto usa **TypeORM** com EntitySchema pattern (JavaScript puro, sem decorators).

### Acessando Repositórios

Use os helpers de `src/utils/repositories.js`:

```javascript
const { getUserRepository, getUserPreferencesRepository } = require('../utils/repositories');

const userRepo = getUserRepository();
const preferencesRepo = getUserPreferencesRepository();
```

### Operações Comuns

#### 1. Buscar (Find)
```javascript
// Por ID
const user = await userRepo.findOne({ where: { id: userId } });

// Com condições
const user = await userRepo.findOne({
  where: { email: 'user@example.com', status: 'active' }
});

// Listar todos
const users = await userRepo.find();

// Com select específico
const user = await userRepo.findOne({
  where: { id: userId },
  select: ['id', 'firstName', 'email']
});
```

#### 2. Criar e Salvar
```javascript
// Criar entidade
const user = userRepo.create({
  firstName: 'João',
  lastName: 'Silva',
  email: 'joao@example.com',
  passwordHash: hashedPassword,
  role: 'user'
});

// Salvar no banco
await userRepo.save(user);
```

#### 3. Atualizar
```javascript
// Atualizar por ID
await userRepo.update(
  { id: userId },
  { firstName: 'João Silva', status: 'active' }
);

// Ou buscar, modificar e salvar
const user = await userRepo.findOne({ where: { id: userId } });
user.firstName = 'João Silva';
await userRepo.save(user);
```

#### 4. Deletar
```javascript
// Soft delete (recomendado - preenche deletedAt)
await userRepo.softDelete({ id: userId });

// Hard delete (remove permanentemente)
await userRepo.delete({ id: userId });
```

#### 5. Queries Complexas (Query Builder)
```javascript
// Login com username OU email
const user = await userRepo.createQueryBuilder('user')
  .where('(user.username = :login OR user.email = :login)', { login })
  .andWhere('user.deletedAt IS NULL')
  .select(['user.id', 'user.passwordHash', 'user.email', 'user.username'])
  .getOne();

// Paginação
const [users, total] = await userRepo.createQueryBuilder('user')
  .where('user.status = :status', { status: 'active' })
  .skip((page - 1) * limit)
  .take(limit)
  .getManyAndCount();
```

#### 6. Raw SQL (quando necessário)
```javascript
const AppDataSource = require('../config/database');

const queryRunner = AppDataSource.createQueryRunner();
await queryRunner.connect();

await queryRunner.query(`
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
`);

await queryRunner.release();
```

### Entidades Disponíveis

#### User (`src/entities/User.js`)
- **42 campos** incluindo id, firstName, lastName, username, email, passwordHash, role, status, etc.
- Relacionamento **one-to-one** com UserPreferences
- **Soft delete** habilitado (campo deletedAt)

#### UserPreferences (`src/entities/UserPreferences.js`)
- **10 campos** de preferências de interface (theme, fontSize, etc.)
- Foreign key para User (userId)
- **Cascade delete** automático quando usuário é removido

### Mapeamento de Campos

TypeORM mapeia automaticamente camelCase ↔ snake_case:

| JavaScript (código) | PostgreSQL (banco) |
|---------------------|-------------------|
| `firstName`         | `first_name`      |
| `lastName`          | `last_name`       |
| `passwordHash`      | `password_hash`   |
| `emailVerified`     | `email_verified`  |

### Importante: Migrations

⚠️ As migrations TypeORM estão **desabilitadas** (`migrations: []`).

O projeto usa migrations SQL manuais em `src/migrations/`. Para modificar o schema:
1. Crie migration SQL em `src/migrations/`
2. Execute com `npm run migrate:up`
3. **Sempre** atualize a entidade correspondente em `src/entities/`

### Referências

- [TypeORM Documentation](https://typeorm.io)
- [EntitySchema](https://typeorm.io/entity-schema)
- [Repository API](https://typeorm.io/repository-api)
- [Query Builder](https://typeorm.io/select-query-builder)

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

## Notas para Desenvolvimento

### Importante para o Claude Code
⚠️ **Regras de Commit:**
- **NÃO** fazer commit automaticamente após alterações
- **NÃO** fazer push automaticamente
- Sempre atualizar `.env.example` quando modificar `.env`
- Apenas fazer commit/push quando explicitamente solicitado pelo usuário

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

### Ao modificar variáveis de ambiente
1. Editar `.env` com os novos valores
2. Atualizar `.env.example` removendo valores sensíveis
3. Documentar no CLAUDE.md e README.md se necessário
4. Aguardar solicitação do usuário para commit/push