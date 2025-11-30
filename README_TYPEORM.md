# TypeORM - Guia de Uso

Este documento explica como usar TypeORM no projeto.

## 📚 O que é TypeORM?

TypeORM é um ORM (Object-Relational Mapping) que permite trabalhar com bancos de dados relacionais usando objetos JavaScript/TypeScript ao invés de escrever queries SQL diretamente.

## 🎯 Benefícios

- ✅ **Abstração do Banco**: Escreva código JavaScript ao invés de SQL
- ✅ **Type Safety**: Maior segurança de tipos (especialmente com TypeScript)
- ✅ **Migrations**: Controle de versão do schema do banco
- ✅ **Relacionamentos**: Gerenciamento fácil de relacionamentos entre entidades
- ✅ **Query Builder**: Construa queries complexas de forma programática
- ✅ **Active Record & Data Mapper**: Suporta ambos os padrões

## 📦 Instalação

TypeORM já está instalado no projeto. Pacotes necessários:

```bash
npm install typeorm reflect-metadata
```

## ⚙️ Configuração

### Arquivo de Configuração

O TypeORM está configurado em `src/config/typeorm.js`:

```javascript
const { DataSource } = require('typeorm');

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'api_db',
  synchronize: false, // NUNCA true em produção!
  logging: process.env.NODE_ENV === 'development',
  entities: [/* entidades aqui */],
  migrations: [],
  subscribers: []
});
```

### Inicialização

O Data Source é inicializado no `server.js`:

```javascript
const { initializeDatabase } = require('./config/typeorm');

// Inicializar TypeORM
await initializeDatabase();
```

## 🏗️ Estrutura do Projeto

```
src/
├── entities/           # Entidades (models)
│   ├── User.js
│   ├── Vehicle.js
│   ├── Maintenance.js
│   └── ...
├── repositories/       # Repositories (opcional)
│   ├── UserRepository.js
│   └── VehicleRepository.js
└── config/
    └── typeorm.js     # Configuração TypeORM
```

## 📋 Entidades

As entidades são definidas usando `EntitySchema`:

```javascript
const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'User',
  tableName: 'users',
  columns: {
    id: {
      type: 'int',
      primary: true,
      generated: true
    },
    first_name: {
      type: 'varchar',
      length: 50,
      nullable: false
    },
    // ... outros campos
  },
  relations: {
    vehicles: {
      type: 'one-to-many',
      target: 'Vehicle',
      inverseSide: 'user',
      cascade: true
    }
  }
});
```

## 🔍 Usando Repositories

### Obter Repository

```javascript
const { AppDataSource } = require('../config/typeorm');

// Obter repository
const userRepository = AppDataSource.getRepository('User');
```

### Operações Básicas

#### Create (Criar)

```javascript
// Criar um novo usuário
const user = userRepository.create({
  first_name: 'João',
  last_name: 'Silva',
  username: 'joao.silva',
  email: 'joao@email.com',
  password_hash: hashedPassword
});

await userRepository.save(user);
```

#### Read (Ler)

```javascript
// Buscar por ID
const user = await userRepository.findOne({
  where: { id: 1 }
});

// Buscar com relacionamentos
const user = await userRepository.findOne({
  where: { id: 1 },
  relations: ['vehicles', 'preferences']
});

// Buscar todos
const users = await userRepository.find();

// Buscar com condições
const activeUsers = await userRepository.find({
  where: { status: 'active' }
});
```

#### Update (Atualizar)

```javascript
// Atualizar usando update
await userRepository.update(userId, {
  first_name: 'João Carlos'
});

// Atualizar usando save
const user = await userRepository.findOne({ where: { id: userId } });
user.first_name = 'João Carlos';
await userRepository.save(user);
```

#### Delete (Deletar)

```javascript
// Hard delete
await userRepository.delete(userId);

// Soft delete (se configurado)
await userRepository.softDelete(userId);
```

### Query Builder

Para queries mais complexas, use o Query Builder:

```javascript
const users = await userRepository
  .createQueryBuilder('user')
  .where('user.status = :status', { status: 'active' })
  .andWhere('user.role = :role', { role: 'admin' })
  .orderBy('user.created_at', 'DESC')
  .take(10)
  .getMany();
```

### Relacionamentos

#### One-to-One

```javascript
// Buscar usuário com preferências
const user = await userRepository.findOne({
  where: { id: 1 },
  relations: ['preferences']
});

console.log(user.preferences.theme_mode);
```

#### One-to-Many

```javascript
// Buscar usuário com todos os veículos
const user = await userRepository.findOne({
  where: { id: 1 },
  relations: ['vehicles']
});

user.vehicles.forEach(vehicle => {
  console.log(vehicle.brand, vehicle.model);
});
```

#### Many-to-One

```javascript
// Buscar veículo com informações do usuário
const vehicle = await vehicleRepository.findOne({
  where: { id: 1 },
  relations: ['user']
});

console.log('Proprietário:', vehicle.user.first_name);
```

## 🔄 Transactions

Use transactions para operações que precisam ser atômicas:

```javascript
await AppDataSource.transaction(async (transactionalEntityManager) => {
  // Criar usuário
  const user = await transactionalEntityManager.save('User', {
    first_name: 'João',
    last_name: 'Silva',
    email: 'joao@email.com',
    password_hash: hashedPassword
  });

  // Criar preferências para o usuário
  await transactionalEntityManager.save('UserPreference', {
    user_id: user.id,
    theme_mode: 'dark',
    theme_color: 'blue'
  });

  // Se qualquer operação falhar, tudo será revertido
});
```

## 📊 Agregações

```javascript
// Contar usuários
const totalUsers = await userRepository.count();

// Contar com condições
const activeUsers = await userRepository.count({
  where: { status: 'active' }
});

// Agregações com Query Builder
const stats = await userRepository
  .createQueryBuilder('user')
  .select('user.role', 'role')
  .addSelect('COUNT(*)', 'count')
  .groupBy('user.role')
  .getRawMany();
```

## 🔍 Filtros e Paginação

```javascript
// Paginação
const [users, total] = await userRepository.findAndCount({
  skip: (page - 1) * limit,
  take: limit,
  order: { created_at: 'DESC' }
});

return {
  data: users,
  total,
  page,
  totalPages: Math.ceil(total / limit)
};
```

## 🎨 Custom Repositories

Para lógica mais complexa, crie repositories personalizados:

```javascript
// src/repositories/UserRepository.js
class UserRepository {
  constructor() {
    this.repository = AppDataSource.getRepository('User');
  }

  async findByEmailOrUsername(emailOrUsername) {
    return await this.repository
      .createQueryBuilder('user')
      .where('user.email = :value OR user.username = :value', {
        value: emailOrUsername
      })
      .getOne();
  }

  async findActiveUsers(page = 1, limit = 10) {
    const [users, total] = await this.repository.findAndCount({
      where: { status: 'active' },
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'DESC' }
    });

    return { users, total, page, limit };
  }
}

module.exports = new UserRepository();
```

## 📝 Exemplo Completo

### Controller com TypeORM

```javascript
const { AppDataSource } = require('../config/typeorm');
const logger = require('../config/logger');

const userRepository = AppDataSource.getRepository('User');

// Listar usuários
const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, status = 'active' } = req.query;

    const [users, total] = await userRepository.findAndCount({
      where: { status },
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'DESC' },
      select: ['id', 'first_name', 'last_name', 'username', 'email', 'role', 'created_at']
    });

    logger.info('Users retrieved', { userId: req.user.id, count: users.length });

    res.json({
      success: true,
      data: users,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    logger.error('Error retrieving users', { error: error.message });
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível buscar os usuários'
    });
  }
};

// Buscar usuário por ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await userRepository.findOne({
      where: { id },
      relations: ['preferences', 'vehicles'],
      select: ['id', 'first_name', 'last_name', 'username', 'email', 'role', 'created_at']
    });

    if (!user) {
      return res.status(404).json({
        error: 'Usuário não encontrado'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error('Error retrieving user', { userId: req.params.id, error: error.message });
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
};

module.exports = {
  getUsers,
  getUserById
};
```

## ⚠️ Melhores Práticas

1. **NUNCA use `synchronize: true` em produção**
   - Use migrations para controlar o schema

2. **Sempre use select para limitar campos**
   - Não retorne dados sensíveis como `password_hash`

3. **Use transactions para operações atômicas**
   - Garante consistência dos dados

4. **Cache de repositories**
   - Crie repositories uma vez e reutilize

5. **Validação de dados**
   - TypeORM não valida dados, use express-validator

6. **Índices**
   - Configure índices nas entidades para performance

7. **Logging**
   - Habilite logging em desenvolvimento para debug

## 📚 Recursos

- [Documentação Official](https://typeorm.io/)
- [GitHub](https://github.com/typeorm/typeorm)
- [API Reference](https://typeorm.io/select-query-builder)

## 🔄 Migração do Código Atual

Para migrar um controller que usa `pool.query` para TypeORM:

### Antes (com pg)

```javascript
const pool = require('../config/database');

const getUsers = async (req, res) => {
  const result = await pool.query('SELECT * FROM users WHERE status = $1', ['active']);
  res.json({ data: result.rows });
};
```

### Depois (com TypeORM)

```javascript
const { AppDataSource } = require('../config/typeorm');
const userRepository = AppDataSource.getRepository('User');

const getUsers = async (req, res) => {
  const users = await userRepository.find({ where: { status: 'active' } });
  res.json({ data: users });
};
```

## 🚀 Próximos Passos

1. ✅ TypeORM configurado e testado
2. ✅ Entidades criadas para todas as tabelas
3. ✅ Repositories de exemplo criados
4. ⏳ Migrar controllers para usar TypeORM
5. ⏳ Criar migrations TypeORM (opcional)
6. ⏳ Adicionar testes unitários para repositories

---

**Nota**: TypeORM é uma camada adicional opcional. O código atual com `pool.query` continua funcionando. A migração pode ser feita gradualmente.
