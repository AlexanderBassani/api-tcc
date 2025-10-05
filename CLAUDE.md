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
  - `config/` - Configurações (database, initDb)
  - `controllers/` - Controladores das rotas
  - `routes/` - Definição das rotas
  - `models/` - Modelos (para futuras implementações)
- `__tests__/` - Testes Jest
- `scripts/` - Scripts utilitários

## Tecnologias Utilizadas

- **Node.js** - Runtime JavaScript
- **Express** - Framework web
- **PostgreSQL** - Banco de dados
- **Jest** - Framework de testes
- **Supertest** - Testes de API
- **dotenv** - Gerenciamento de variáveis de ambiente
- **pg** - Driver PostgreSQL para Node.js

## Configuração do Banco

O projeto usa PostgreSQL com as seguintes configurações padrão no `.env`:
- Host: localhost
- Porta: 5432
- Banco: api_db
- Usuário: postgres
- Senha: password

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
- `POST /api/users` - Cria novo usuário
- `PUT /api/users/profile` - Atualizar perfil
- `PUT /api/users/change-password` - Trocar própria senha
- `PUT /api/users/:id/change-password` - Trocar senha de outro usuário (admin)

### Recuperação de Senha
- `POST /api/password-reset/request` - Solicitar reset de senha
- `POST /api/password-reset/validate-token` - Validar token de reset
- `POST /api/password-reset/reset` - Redefinir senha

## Notas para Desenvolvimento

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