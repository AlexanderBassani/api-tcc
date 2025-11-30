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
    maintenance_type_id: {
      type: 'int',
      nullable: true
    },
    service_provider_id: {
      type: 'int',
      nullable: true
    },
    type: {
      type: 'varchar',
      length: 100,
      nullable: true
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
      nullable: false
    },
    is_completed: {
      type: 'boolean',
      default: false
    },
    notes: {
      type: 'text',
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
    maintenanceType: {
      type: 'many-to-one',
      target: 'MaintenanceType',
      joinColumn: {
        name: 'maintenance_type_id'
      },
      onDelete: 'SET NULL',
      nullable: true
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
