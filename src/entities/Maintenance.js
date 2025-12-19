const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'Maintenance',
  tableName: 'maintenances',
  columns: {
    id: {
      type: 'int',
      primary: true,
      generated: true
    },
    vehicle_id: {
      type: 'int',
      nullable: false
    },
    service_provider_id: {
      type: 'int',
      nullable: true
    },
    type: {
      type: 'varchar',
      length: 50,
      nullable: false
    },
    category: {
      type: 'varchar',
      length: 50,
      nullable: false,
      default: 'other'
    },
    description: {
      type: 'text',
      nullable: false
    },
    cost: {
      type: 'decimal',
      precision: 10,
      scale: 2,
      nullable: false
    },
    service_date: {
      type: 'date',
      nullable: false
    },
    km_at_service: {
      type: 'int',
      nullable: true
    },
    next_service_km: {
      type: 'int',
      nullable: true
    },
    next_service_date: {
      type: 'date',
      nullable: true
    },
    invoice_number: {
      type: 'varchar',
      length: 50,
      nullable: true
    },
    warranty_until: {
      type: 'date',
      nullable: true
    },
    is_completed: {
      type: 'boolean',
      default: false
    },
    completed_at: {
      type: 'timestamp',
      nullable: true
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
    vehicle: {
      type: 'many-to-one',
      target: 'Vehicle',
      joinColumn: {
        name: 'vehicle_id'
      },
      onDelete: 'CASCADE'
    },
    serviceProvider: {
      type: 'many-to-one',
      target: 'ServiceProvider',
      joinColumn: {
        name: 'service_provider_id'
      },
      onDelete: 'SET NULL',
      nullable: true
    },
    attachments: {
      type: 'one-to-many',
      target: 'MaintenanceAttachment',
      inverseSide: 'maintenance',
      cascade: true
    }
  },
  indices: [
    {
      name: 'idx_maintenances_vehicle_id',
      columns: ['vehicle_id']
    },
    {
      name: 'idx_maintenances_service_date',
      columns: ['service_date']
    }
  ]
});
