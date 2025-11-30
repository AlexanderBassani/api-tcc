const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'Reminder',
  tableName: 'reminders',
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
    type: {
      type: 'varchar',
      length: 50,
      nullable: false
    },
    title: {
      type: 'varchar',
      length: 200,
      nullable: false
    },
    description: {
      type: 'text',
      nullable: true
    },
    remind_at_km: {
      type: 'int',
      nullable: true
    },
    remind_at_date: {
      type: 'date',
      nullable: true
    },
    status: {
      type: 'varchar',
      length: 20,
      default: 'pending'
    },
    is_recurring: {
      type: 'boolean',
      default: false
    },
    recurrence_km: {
      type: 'int',
      nullable: true
    },
    recurrence_months: {
      type: 'int',
      nullable: true
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
    }
  },
  indices: [
    {
      name: 'idx_reminders_vehicle_id',
      columns: ['vehicle_id']
    },
    {
      name: 'idx_reminders_status',
      columns: ['status']
    },
    {
      name: 'idx_reminders_remind_at_date',
      columns: ['remind_at_date']
    }
  ]
});
