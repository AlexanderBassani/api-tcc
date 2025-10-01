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

# Frontend URL (for password reset links)
FRONTEND_URL=http://localhost:3000
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
- `POST /api/users` - Criar novo usuário (admin)
- `PUT /api/users/profile` - Atualizar perfil do usuário autenticado
- `PUT /api/users/change-password` - Alterar senha (usuário logado)
- `PUT /api/users/:id/change-password` - Alterar senha de outro usuário (admin)

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

## 🔑 Sistema de Roles

O sistema implementa controle de acesso baseado em roles:

### Roles Disponíveis
- **admin** - Acesso total ao sistema
- **user** - Usuário padrão com permissões básicas

### Como funciona
- Todos os novos usuários recebem automaticamente a role `user`
- A role é incluída no JWT token e pode ser usada para autorização
- Para criar um admin, especifique `"role": "admin"` no body do POST

## 📁 Estrutura do Projeto

```
src/
├── config/          # Configurações
│   ├── database.js      # Conexão PostgreSQL
│   ├── email.js         # Configuração de email (nodemailer)
│   └── initDb.js        # Inicialização do banco
├── controllers/     # Controladores
│   ├── userController.js        # CRUD de usuários + auth
│   └── passwordResetController.js  # Reset de senha
├── middleware/      # Middlewares
│   ├── auth.js          # Autenticação JWT
│   └── errorHandler.js  # Tratamento de erros
├── migrations/      # Migrations do banco
├── routes/          # Rotas da API
│   ├── userRoutes.js       # Rotas de usuários
│   └── passwordReset.js    # Rotas de reset de senha
├── templates/       # Templates de email
│   └── passwordResetEmail.js  # Template de reset de senha
├── utils/           # Utilitários
│   ├── responses.js     # Respostas padronizadas
│   └── tokenGenerator.js  # Geração de tokens seguros
├── app.js          # Configuração do Express
└── server.js       # Inicialização do servidor
__tests__/          # Testes Jest
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

## 🐳 Serviços Docker

O projeto inclui os seguintes serviços:

1. **API (Node.js)** - Porta 3001 (externa) / 3000 (interna)
2. **PostgreSQL** - Porta 5432
3. **PgAdmin** - Porta 8080 (Interface web para PostgreSQL)

## 🔧 Tecnologias Utilizadas

- **Backend:** Node.js, Express
- **Banco:** PostgreSQL, pg (driver)
- **Autenticação:** JWT (jsonwebtoken)
- **Segurança:** bcrypt/bcryptjs para hash de senhas
- **Email:** nodemailer (com suporte Ethereal/Gmail/SMTP)
- **Testes:** Jest, Supertest
- **Infraestrutura:** Docker, Docker Compose
- **Desenvolvimento:** nodemon (hot-reload), dotenv

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
- ✅ Proteção contra brute force (bloqueio após 5 tentativas por 15 minutos)
- ✅ Validação de entrada de dados
- ✅ Soft delete de usuários
- ✅ Tokens JWT com expiração configurável
- ✅ Tokens de reset de senha hasheados (SHA256)
- ✅ Tokens de reset com expiração (30 minutos)
- ✅ Middleware de autenticação para rotas protegidas
- ✅ Proteção contra enumeração de usuários (mensagens genéricas)

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

## 🚀 Próximos Passos

1. ~~Implementar autenticação JWT~~ ✅
2. ~~Adicionar middleware de autorização~~ ✅
3. ~~Criar endpoints de login/logout~~ ✅
4. ~~Implementar sistema de roles (admin, user)~~ ✅
5. ~~Sistema de migrations~~ ✅
6. ~~Implementar reset de senha por email~~ ✅
7. Implementar middleware de autorização por role
8. Implementar verificação de email
9. Adicionar upload de imagem de perfil
10. Documentar API com Swagger
11. Adicionar rate limiting
12. Implementar 2FA (Two-Factor Authentication)