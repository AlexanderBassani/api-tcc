const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'MaintenanceType',
  tableName: 'maintenance_types',
  columns: {
    id: {
      type: 'int',
      primary: true,
      generated: true
    },
    name: {
      type: 'varchar',
      length: 100,
      unique: true,
      nullable: false
    },
    display_name: {
      type: 'varchar',
      length: 100,
      nullable: false
    },
    typical_interval_km: {
      type: 'int',
      nullable: true
    },
    typical_interval_months: {
      type: 'int',
      nullable: true
    },
    icon: {
      type: 'varchar',
      length: 50,
      nullable: true
    },
    created_at: {
      type: 'timestamp',
      createDate: true
    }
  }
});
