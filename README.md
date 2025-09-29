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
npm run docker:init-db
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
```
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=api_db
DB_PORT=5432
PORT=3000

# JWT Configuration
JWT_SECRET=your-secret-key-change-this-in-production
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=your-refresh-secret-key-change-this-in-production
JWT_REFRESH_EXPIRES_IN=7d
```
⚠️ **IMPORTANTE:** Altere as chaves JWT em produção!

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

### Docker
- `npm run docker:build` - Constrói as imagens Docker
- `npm run docker:up` - Inicia todos os serviços
- `npm run docker:down` - Para todos os serviços
- `npm run docker:logs` - Visualiza logs dos containers
- `npm run docker:init-db` - Inicializa banco no container
- `npm run docker:dev` - Desenvolvimento com rebuild automático

## 🌐 Endpoints da API

### Básicos
- `GET /` - Retorna mensagem de boas-vindas
- `GET /health` - Retorna status da API

### Autenticação (Público)
- `POST /api/users/register` - Registrar novo usuário (retorna JWT)
- `POST /api/users/login` - Login com username/email e senha (retorna JWT)
- `POST /api/users/refresh-token` - Renovar token de acesso

### Usuários (Requer autenticação JWT)
- `GET /api/users` - Lista todos os usuários
- `GET /api/users/profile` - Ver perfil do usuário autenticado
- `GET /api/users/:id` - Buscar usuário por ID
- `POST /api/users` - Criar novo usuário (admin)
- `PUT /api/users/profile` - Atualizar perfil do usuário autenticado
- `POST /api/users/change-password` - Alterar senha do usuário autenticado

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

⚠️ **IMPORTANTE:** Altere a senha após o primeiro login!

## 📁 Estrutura do Projeto

```
src/
├── config/          # Configurações (banco de dados, inicialização)
├── controllers/     # Controladores das rotas (userController com JWT)
├── middleware/      # Middlewares (auth JWT, errorHandler)
├── models/          # Modelos (futura implementação)
├── routes/          # Definição das rotas (userRoutes)
├── utils/           # Utilitários
├── app.js          # Configuração do Express
└── server.js       # Inicialização do servidor
__tests__/          # Testes Jest
scripts/            # Scripts utilitários (init-db)
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

### Segurança
- `password_hash` - Hash da senha (VARCHAR 255)
- `email_verified` - Email verificado (BOOLEAN)
- `phone_verified` - Telefone verificado (BOOLEAN)
- `two_factor_enabled` - 2FA habilitado (BOOLEAN)
- `login_attempts` - Tentativas de login (INTEGER)
- `locked_until` - Bloqueado até (TIMESTAMP)
- `password_reset_token` - Token reset senha (VARCHAR 255)
- `email_verification_token` - Token verificação email (VARCHAR 255)

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
- **Banco:** PostgreSQL
- **Autenticação:** JWT (jsonwebtoken)
- **Segurança:** bcrypt/bcryptjs para hash de senhas
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

- ✅ Hash de senhas com bcrypt
- ✅ Autenticação JWT (access + refresh tokens)
- ✅ Proteção contra brute force (bloqueio após 5 tentativas)
- ✅ Validação de entrada de dados
- ✅ Soft delete de usuários
- ✅ Tokens com expiração configurável
- ✅ Middleware de autenticação para rotas protegidas

## 🚀 Próximos Passos

1. ~~Implementar autenticação JWT~~ ✅
2. ~~Adicionar middleware de autorização~~ ✅
3. ~~Criar endpoints de login/logout~~ ✅
4. Implementar reset de senha por email
5. Implementar verificação de email
6. Adicionar upload de imagem de perfil
7. Implementar sistema de roles (admin, user)
8. Documentar API com Swagger
9. Adicionar rate limiting
10. Implementar 2FA (Two-Factor Authentication)