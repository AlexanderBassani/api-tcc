const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'MaintenanceAttachment',
  tableName: 'maintenance_attachments',
  columns: {
    id: {
      type: 'int',
      primary: true,
      generated: true
    },
    maintenance_id: {
      type: 'int',
      nullable: false
    },
    file_name: {
      type: 'varchar',
      length: 255,
      nullable: false
    },
    file_path: {
      type: 'varchar',
      length: 500,
      nullable: false
    },
    file_type: {
      type: 'varchar',
      length: 100,
      nullable: false
    },
    file_size: {
      type: 'int',
      nullable: false
    },
    uploaded_at: {
      type: 'timestamp',
      createDate: true
    }
  },
  relations: {
    maintenance: {
      type: 'many-to-one',
      target: 'Maintenance',
      joinColumn: {
        name: 'maintenance_id'
      },
      onDelete: 'CASCADE'
    }
  },
  indices: [
    {
      name: 'idx_maintenance_attachments_maintenance_id',
      columns: ['maintenance_id']
    }
  ]
});
