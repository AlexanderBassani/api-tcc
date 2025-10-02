const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Documentation',
      version: '1.0.0',
      description: 'API documentation with authentication, user management, and password reset',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'http://localhost:3001',
        description: 'Docker development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'User ID',
            },
            first_name: {
              type: 'string',
              description: 'First name',
            },
            last_name: {
              type: 'string',
              description: 'Last name',
            },
            username: {
              type: 'string',
              description: 'Username',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Email address',
            },
            role: {
              type: 'string',
              enum: ['admin', 'user'],
              description: 'User role',
            },
            phone: {
              type: 'string',
              description: 'Phone number',
            },
            date_of_birth: {
              type: 'string',
              format: 'date',
              description: 'Date of birth',
            },
            gender: {
              type: 'string',
              enum: ['male', 'female', 'other', 'prefer_not_to_say'],
              description: 'Gender',
            },
            profile_image_url: {
              type: 'string',
              description: 'Profile image URL',
            },
            bio: {
              type: 'string',
              description: 'Biography',
            },
            status: {
              type: 'string',
              enum: ['active', 'inactive', 'suspended'],
              description: 'Account status',
            },
            email_verified: {
              type: 'boolean',
              description: 'Email verification status',
            },
            phone_verified: {
              type: 'boolean',
              description: 'Phone verification status',
            },
            two_factor_enabled: {
              type: 'boolean',
              description: 'Two-factor authentication status',
            },
            preferred_language: {
              type: 'string',
              description: 'Preferred language',
            },
            timezone: {
              type: 'string',
              description: 'Timezone',
            },
            last_login_at: {
              type: 'string',
              format: 'date-time',
              description: 'Last login timestamp',
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
            },
          },
        },
        UserRegistration: {
          type: 'object',
          required: ['first_name', 'last_name', 'username', 'email', 'password'],
          properties: {
            first_name: {
              type: 'string',
              description: 'First name',
              example: 'João',
            },
            last_name: {
              type: 'string',
              description: 'Last name',
              example: 'Silva',
            },
            username: {
              type: 'string',
              description: 'Username (3-30 characters)',
              minLength: 3,
              maxLength: 30,
              example: 'joaosilva',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Email address',
              example: 'joao.silva@example.com',
            },
            password: {
              type: 'string',
              format: 'password',
              description: 'Password (min 6 characters)',
              minLength: 6,
              example: 'senha123',
            },
            phone: {
              type: 'string',
              description: 'Phone number (optional)',
              example: '+5511999999999',
            },
            date_of_birth: {
              type: 'string',
              format: 'date',
              description: 'Date of birth (optional)',
              example: '1990-01-01',
            },
            gender: {
              type: 'string',
              enum: ['male', 'female', 'other', 'prefer_not_to_say'],
              description: 'Gender (optional)',
              example: 'male',
            },
          },
        },
        UserLogin: {
          type: 'object',
          required: ['login', 'password'],
          properties: {
            login: {
              type: 'string',
              description: 'Username or email',
              example: 'joaosilva',
            },
            password: {
              type: 'string',
              format: 'password',
              description: 'Password',
              example: 'senha123',
            },
          },
        },
        TokenResponse: {
          type: 'object',
          properties: {
            token: {
              type: 'string',
              description: 'Access token (JWT)',
            },
            refreshToken: {
              type: 'string',
              description: 'Refresh token',
            },
            user: {
              $ref: '#/components/schemas/User',
            },
          },
        },
        RefreshToken: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: {
              type: 'string',
              description: 'Refresh token',
            },
          },
        },
        CreateUser: {
          type: 'object',
          required: ['first_name', 'last_name', 'username', 'email', 'password'],
          properties: {
            first_name: {
              type: 'string',
              description: 'First name',
              example: 'Maria',
            },
            last_name: {
              type: 'string',
              description: 'Last name',
              example: 'Santos',
            },
            username: {
              type: 'string',
              description: 'Username (3-30 characters)',
              minLength: 3,
              maxLength: 30,
              example: 'mariasantos',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Email address',
              example: 'maria.santos@example.com',
            },
            password: {
              type: 'string',
              format: 'password',
              description: 'Password (min 6 characters)',
              minLength: 6,
              example: 'senha123',
            },
            role: {
              type: 'string',
              enum: ['admin', 'user'],
              description: 'User role (optional)',
              example: 'user',
            },
            phone: {
              type: 'string',
              description: 'Phone number (optional)',
              example: '+5511888888888',
            },
            date_of_birth: {
              type: 'string',
              format: 'date',
              description: 'Date of birth (optional)',
              example: '1995-05-15',
            },
            gender: {
              type: 'string',
              enum: ['male', 'female', 'other', 'prefer_not_to_say'],
              description: 'Gender (optional)',
              example: 'female',
            },
          },
        },
        UpdateProfile: {
          type: 'object',
          properties: {
            first_name: {
              type: 'string',
              description: 'First name',
              example: 'João',
            },
            last_name: {
              type: 'string',
              description: 'Last name',
              example: 'Silva',
            },
            phone: {
              type: 'string',
              description: 'Phone number',
              example: '+5511999999999',
            },
            date_of_birth: {
              type: 'string',
              format: 'date',
              description: 'Date of birth',
              example: '1990-01-01',
            },
            gender: {
              type: 'string',
              enum: ['male', 'female', 'other', 'prefer_not_to_say'],
              description: 'Gender',
              example: 'male',
            },
            profile_image_url: {
              type: 'string',
              description: 'Profile image URL',
              example: 'https://example.com/images/profile.jpg',
            },
            bio: {
              type: 'string',
              description: 'User biography',
              example: 'Software developer and tech enthusiast',
            },
            preferred_language: {
              type: 'string',
              description: 'Preferred language',
              example: 'pt-BR',
            },
            timezone: {
              type: 'string',
              description: 'Timezone',
              example: 'America/Sao_Paulo',
            },
          },
        },
        ChangePassword: {
          type: 'object',
          required: ['newPassword'],
          properties: {
            currentPassword: {
              type: 'string',
              format: 'password',
              description: 'Current password (required when changing own password without admin override)',
              example: 'senhaAtual123',
            },
            newPassword: {
              type: 'string',
              format: 'password',
              description: 'New password (min 6 characters)',
              minLength: 6,
              example: 'novaSenha123',
            },
            adminOverride: {
              type: 'boolean',
              description: 'Admin override to force password change without current password',
              example: false,
            },
          },
        },
        PasswordResetRequest: {
          type: 'object',
          required: ['email'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'Email address to send reset link',
            },
          },
        },
        ValidateResetToken: {
          type: 'object',
          required: ['token'],
          properties: {
            token: {
              type: 'string',
              description: 'Password reset token',
            },
          },
        },
        ResetPassword: {
          type: 'object',
          required: ['token', 'newPassword'],
          properties: {
            token: {
              type: 'string',
              description: 'Password reset token',
            },
            newPassword: {
              type: 'string',
              format: 'password',
              description: 'New password (min 6 characters)',
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.js'], // Path to the API routes
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
