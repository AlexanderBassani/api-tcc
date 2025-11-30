const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'FuelRecord',
  tableName: 'fuel_records',
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
    date: {
      type: 'date',
      nullable: false
    },
    km: {
      type: 'int',
      nullable: false
    },
    liters: {
      type: 'decimal',
      precision: 8,
      scale: 2,
      nullable: false
    },
    price_per_liter: {
      type: 'decimal',
      precision: 8,
      scale: 2,
      nullable: false
    },
    total_cost: {
      type: 'decimal',
      precision: 10,
      scale: 2,
      nullable: false
    },
    fuel_type: {
      type: 'varchar',
      length: 20,
      default: 'gasoline'
    },
    is_full_tank: {
      type: 'boolean',
      default: false
    },
    gas_station: {
      type: 'varchar',
      length: 100,
      nullable: true
    },
    notes: {
      type: 'text',
      nullable: true
    },
    consumption_km_per_liter: {
      type: 'decimal',
      precision: 5,
      scale: 2,
      nullable: true
    },
    created_at: {
      type: 'timestamp',
      createDate: true
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
    }
  },
  indices: [
    {
      name: 'idx_fuel_records_vehicle_id',
      columns: ['vehicle_id']
    },
    {
      name: 'idx_fuel_records_date',
      columns: ['date']
    }
  ]
});
