const { EntitySchema } = require('typeorm');

const User = new EntitySchema({
  name: 'User',
  tableName: 'users',
  columns: {
    id: {
      type: 'int',
      primary: true,
      generated: true
    },
    firstName: {
      type: 'varchar',
      length: 50,
      nullable: false,
      name: 'first_name'
    },
    lastName: {
      type: 'varchar',
      length: 50,
      nullable: false,
      name: 'last_name'
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
    passwordHash: {
      type: 'varchar',
      length: 255,
      nullable: false,
      name: 'password_hash'
    },
    role: {
      type: 'enum',
      enum: ['admin', 'user'],
      default: 'user',
      nullable: false
    },
    phone: {
      type: 'varchar',
      length: 20,
      nullable: true
    },
    dateOfBirth: {
      type: 'date',
      nullable: true,
      name: 'date_of_birth'
    },
    gender: {
      type: 'enum',
      enum: ['male', 'female', 'other', 'prefer_not_to_say'],
      nullable: true
    },
    profileImageUrl: {
      type: 'varchar',
      length: 500,
      nullable: true,
      name: 'profile_image_url'
    },
    bio: {
      type: 'text',
      nullable: true
    },
    status: {
      type: 'enum',
      enum: ['active', 'inactive', 'suspended', 'deleted'],
      default: 'active',
      nullable: false
    },
    emailVerified: {
      type: 'boolean',
      default: false,
      nullable: false,
      name: 'email_verified'
    },
    phoneVerified: {
      type: 'boolean',
      default: false,
      nullable: false,
      name: 'phone_verified'
    },
    twoFactorEnabled: {
      type: 'boolean',
      default: false,
      nullable: false,
      name: 'two_factor_enabled'
    },
    preferredLanguage: {
      type: 'varchar',
      length: 10,
      default: 'pt-BR',
      nullable: false,
      name: 'preferred_language'
    },
    timezone: {
      type: 'varchar',
      length: 50,
      default: 'America/Sao_Paulo',
      nullable: false
    },
    lastLoginAt: {
      type: 'timestamp',
      nullable: true,
      name: 'last_login_at'
    },
    loginAttempts: {
      type: 'int',
      default: 0,
      nullable: false,
      name: 'login_attempts'
    },
    lockedUntil: {
      type: 'timestamp',
      nullable: true,
      name: 'locked_until'
    },
    passwordResetToken: {
      type: 'varchar',
      length: 255,
      nullable: true,
      name: 'password_reset_token'
    },
    passwordResetExpires: {
      type: 'timestamp',
      nullable: true,
      name: 'password_reset_expires'
    },
    emailVerificationToken: {
      type: 'varchar',
      length: 255,
      nullable: true,
      name: 'email_verification_token'
    },
    emailVerificationExpires: {
      type: 'timestamp',
      nullable: true,
      name: 'email_verification_expires'
    },
    termsAcceptedAt: {
      type: 'timestamp',
      nullable: true,
      name: 'terms_accepted_at'
    },
    privacyPolicyAcceptedAt: {
      type: 'timestamp',
      nullable: true,
      name: 'privacy_policy_accepted_at'
    },
    marketingEmailsConsent: {
      type: 'boolean',
      default: false,
      nullable: false,
      name: 'marketing_emails_consent'
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
    },
    deletedAt: {
      type: 'timestamp',
      nullable: true,
      deleteDate: true,
      name: 'deleted_at'
    }
  },
  relations: {
    preferences: {
      type: 'one-to-one',
      target: 'UserPreferences',
      inverseSide: 'user',
      cascade: true,
      onDelete: 'CASCADE'
    }
  }
});

module.exports = User;
