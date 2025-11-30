const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'Vehicle',
  tableName: 'vehicles',
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
    brand: {
      type: 'varchar',
      length: 50,
      nullable: false
    },
    model: {
      type: 'varchar',
      length: 50,
      nullable: false
    },
    year: {
      type: 'int',
      nullable: false
    },
    plate: {
      type: 'varchar',
      length: 10,
      unique: true,
      nullable: false
    },
    color: {
      type: 'varchar',
      length: 30,
      nullable: true
    },
    current_km: {
      type: 'int',
      default: 0
    },
    purchase_date: {
      type: 'date',
      nullable: true
    },
    notes: {
      type: 'text',
      nullable: true
    },
    is_active: {
      type: 'boolean',
      default: true
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
      inverseSide: 'vehicle',
      cascade: true
    },
    fuelRecords: {
      type: 'one-to-many',
      target: 'FuelRecord',
      inverseSide: 'vehicle',
      cascade: true
    },
    reminders: {
      type: 'one-to-many',
      target: 'Reminder',
      inverseSide: 'vehicle',
      cascade: true
    }
  },
  indices: [
    {
      name: 'idx_vehicles_user_id',
      columns: ['user_id']
    },
    {
      name: 'idx_vehicles_plate',
      columns: ['plate']
    }
  ]
});
