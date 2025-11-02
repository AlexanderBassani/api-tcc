const { EntitySchema } = require('typeorm');

const UserPreferences = new EntitySchema({
  name: 'UserPreferences',
  tableName: 'user_preferences',
  columns: {
    id: {
      type: 'int',
      primary: true,
      generated: true
    },
    userId: {
      type: 'int',
      unique: true,
      nullable: false,
      name: 'user_id'
    },
    themeMode: {
      type: 'enum',
      enum: ['light', 'dark', 'system'],
      default: 'system',
      nullable: false,
      name: 'theme_mode'
    },
    themeColor: {
      type: 'varchar',
      length: 30,
      default: 'blue',
      nullable: false,
      name: 'theme_color'
    },
    fontSize: {
      type: 'enum',
      enum: ['small', 'medium', 'large', 'extra-large'],
      default: 'medium',
      nullable: false,
      name: 'font_size'
    },
    compactMode: {
      type: 'boolean',
      default: false,
      nullable: false,
      name: 'compact_mode'
    },
    animationsEnabled: {
      type: 'boolean',
      default: true,
      nullable: false,
      name: 'animations_enabled'
    },
    highContrast: {
      type: 'boolean',
      default: false,
      nullable: false,
      name: 'high_contrast'
    },
    reduceMotion: {
      type: 'boolean',
      default: false,
      nullable: false,
      name: 'reduce_motion'
    },
    createdAt: {
      type: 'timestamp',
      createDate: true,
      name: 'created_at'
    },
    updatedAt: {
      type: 'timestamp',
      updateDate: true,
      name: 'updated_at'
    }
  },
  relations: {
    user: {
      type: 'one-to-one',
      target: 'User',
      joinColumn: {
        name: 'user_id',
        referencedColumnName: 'id'
      },
      onDelete: 'CASCADE'
    }
  }
});

module.exports = UserPreferences;
