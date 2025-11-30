const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'User',
  tableName: 'users',
  columns: {
    id: {
      type: 'int',
      primary: true,
      generated: true
    },
    first_name: {
      type: 'varchar',
      length: 50,
      nullable: false
    },
    last_name: {
      type: 'varchar',
      length: 50,
      nullable: false
    },
    username: {
      type: 'varchar',
      length: 30,
      unique: true,
      nullable: false
    },
    email: {
      type: 'varchar',
      length: 100,
      unique: true,
      nullable: false
    },
    password_hash: {
      type: 'varchar',
      length: 255,
      nullable: false
    },
    role: {
      type: 'varchar',
      length: 20,
      default: 'user'
    },
    email_verified: {
      type: 'boolean',
      default: false
    },
    phone_verified: {
      type: 'boolean',
      default: false
    },
    two_factor_enabled: {
      type: 'boolean',
      default: false
    },
    phone: {
      type: 'varchar',
      length: 20,
      nullable: true
    },
    date_of_birth: {
      type: 'date',
      nullable: true
    },
    gender: {
      type: 'varchar',
      length: 10,
      nullable: true
    },
    profile_image_url: {
      type: 'varchar',
      length: 500,
      nullable: true
    },
    bio: {
      type: 'text',
      nullable: true
    },
    preferred_language: {
      type: 'varchar',
      length: 10,
      nullable: true
    },
    timezone: {
      type: 'varchar',
      length: 50,
      nullable: true
    },
    login_attempts: {
      type: 'int',
      default: 0
    },
    locked_until: {
      type: 'timestamp',
      nullable: true
    },
    password_reset_token: {
      type: 'varchar',
      length: 255,
      nullable: true
    },
    password_reset_expires: {
      type: 'timestamp',
      nullable: true
    },
    email_verification_token: {
      type: 'varchar',
      length: 255,
      nullable: true
    },
    email_verification_expires: {
      type: 'timestamp',
      nullable: true
    },
    status: {
      type: 'varchar',
      length: 20,
      default: 'active'
    },
    last_login_at: {
      type: 'timestamp',
      nullable: true
    },
    terms_accepted_at: {
      type: 'timestamp',
      nullable: true
    },
    privacy_policy_accepted_at: {
      type: 'timestamp',
      nullable: true
    },
    marketing_emails_consent: {
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
    },
    deleted_at: {
      type: 'timestamp',
      nullable: true
    }
  },
  relations: {
    preferences: {
      type: 'one-to-one',
      target: 'UserPreference',
      inverseSide: 'user',
      cascade: true
    },
    vehicles: {
      type: 'one-to-many',
      target: 'Vehicle',
      inverseSide: 'user',
      cascade: true
    },
    serviceProviders: {
      type: 'one-to-many',
      target: 'ServiceProvider',
      inverseSide: 'user',
      cascade: true
    }
  }
});
