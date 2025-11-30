const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'UserPreference',
  tableName: 'user_preferences',
  columns: {
    id: {
      type: 'int',
      primary: true,
      generated: true
    },
    user_id: {
      type: 'int',
      unique: true,
      nullable: false
    },
    theme_mode: {
      type: 'varchar',
      length: 20,
      default: 'system'
    },
    theme_color: {
      type: 'varchar',
      length: 30,
      default: 'blue'
    },
    font_size: {
      type: 'varchar',
      length: 20,
      default: 'medium'
    },
    compact_mode: {
      type: 'boolean',
      default: false
    },
    animations_enabled: {
      type: 'boolean',
      default: true
    },
    high_contrast: {
      type: 'boolean',
      default: false
    },
    reduce_motion: {
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
      type: 'one-to-one',
      target: 'User',
      joinColumn: {
        name: 'user_id'
      },
      onDelete: 'CASCADE'
    }
  }
});
