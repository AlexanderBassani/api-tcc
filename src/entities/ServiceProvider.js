const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'ServiceProvider',
  tableName: 'service_providers',
  columns: {
    id: {
      type: 'int',
      primary: true,
      generated: true
    },
    user_id: {
      type: 'int',
      nullable: false
    },
    name: {
      type: 'varchar',
      length: 100,
      nullable: false
    },
    type: {
      type: 'varchar',
      length: 50,
      nullable: false
    },
    phone: {
      type: 'varchar',
      length: 20,
      nullable: true
    },
    email: {
      type: 'varchar',
      length: 100,
      nullable: true
    },
    address: {
      type: 'text',
      nullable: true
    },
    rating: {
      type: 'decimal',
      precision: 2,
      scale: 1,
      default: 0.0
    },
    notes: {
      type: 'text',
      nullable: true
    },
    is_favorite: {
      type: 'boolean',
      default: false
    },
    created_at: {
      type: 'timestamp',
      createDate: true
    },
    updated_at: {
      type: 'timestamp',
      updateDate: true
    }
  },
  relations: {
    user: {
      type: 'many-to-one',
      target: 'User',
      joinColumn: {
        name: 'user_id'
      },
      onDelete: 'CASCADE'
    },
    maintenances: {
      type: 'one-to-many',
      target: 'Maintenance',
      inverseSide: 'serviceProvider'
    }
  },
  indices: [
    {
      name: 'idx_service_providers_user_id',
      columns: ['user_id']
    },
    {
      name: 'idx_service_providers_type',
      columns: ['type']
    }
  ]
});
