# API Node.js com Express, Jest e PostgreSQL

Uma API RESTful construída com Node.js, Express, Jest para testes e PostgreSQL como banco de dados.

## Instalação

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
```

4. Certifique-se de que o PostgreSQL está rodando e crie o banco de dados `api_db`

## Scripts Disponíveis

- `npm start` - Inicia o servidor em produção
- `npm run dev` - Inicia o servidor em modo desenvolvimento (com nodemon)
- `npm test` - Executa os testes
- `npm run test:watch` - Executa os testes em modo watch

## Endpoints

### Básicos
- `GET /` - Retorna mensagem de boas-vindas
- `GET /health` - Retorna status da API

### Usuários
- `GET /api/users` - Lista todos os usuários
- `GET /api/users/:id` - Busca usuário por ID
- `POST /api/users` - Cria novo usuário

## Estrutura do Projeto

```
src/
├── config/          # Configurações (banco de dados)
├── controllers/     # Controladores das rotas
├── models/          # Modelos (futura implementação)
├── routes/          # Definição das rotas
├── app.js          # Configuração do Express
└── server.js       # Inicialização do servidor
__tests__/          # Testes Jest
```

## Inicialização do Banco

Para criar as tabelas necessárias, você pode usar o arquivo `src/config/initDb.js` que contém a função `createTables()`.