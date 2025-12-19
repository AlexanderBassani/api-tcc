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
        MonthlyExpense: {
          type: 'object',
          properties: {
            month: {
              type: 'string',
              description: 'Month abbreviation (e.g., Jan, Feb)',
              example: 'Jan',
            },
            fuel: {
              type: 'number',
              format: 'float',
              description: 'Total fuel expenses',
              example: 450.50,
            },
            maintenance: {
              type: 'number',
              format: 'float',
              description: 'Total maintenance expenses',
              example: 200.00,
            },
            others: {
              type: 'number',
              format: 'float',
              description: 'Other expenses',
              example: 50.00,
            },
            total: {
              type: 'number',
              format: 'float',
              description: 'Total monthly expenses',
              example: 700.50,
            },
          },
        },
        ExpensesTotals: {
          type: 'object',
          properties: {
            fuel: {
              type: 'number',
              format: 'float',
              description: 'Total fuel expenses',
              example: 1880.00,
            },
            maintenance: {
              type: 'number',
              format: 'float',
              description: 'Total maintenance expenses',
              example: 1000.00,
            },
            others: {
              type: 'number',
              format: 'float',
              description: 'Other expenses',
              example: 480.00,
            },
            total: {
              type: 'number',
              format: 'float',
              description: 'Grand total',
              example: 3360.00,
            },
            fuel_percentage: {
              type: 'number',
              format: 'float',
              description: 'Fuel percentage',
              example: 56.0,
            },
            maintenance_percentage: {
              type: 'number',
              format: 'float',
              description: 'Maintenance percentage',
              example: 30.0,
            },
            others_percentage: {
              type: 'number',
              format: 'float',
              description: 'Others percentage',
              example: 14.0,
            },
          },
        },
        MonthlyExpensesResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'object',
              properties: {
                monthly: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/MonthlyExpense',
                  },
                },
                totals: {
                  $ref: '#/components/schemas/ExpensesTotals',
                },
              },
            },
          },
        },
        UpcomingMaintenance: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Reminder ID',
              example: 1,
            },
            vehicle_id: {
              type: 'integer',
              description: 'Vehicle ID',
              example: 5,
            },
            vehicle: {
              type: 'string',
              description: 'Vehicle description',
              example: 'Honda Civic - ABC-1234',
            },
            title: {
              type: 'string',
              description: 'Maintenance title',
              example: 'Troca de Pneus',
            },
            description: {
              type: 'string',
              description: 'Maintenance description',
              example: 'Revisão 20.000km',
            },
            type: {
              type: 'string',
              description: 'Reminder type',
              example: 'maintenance',
            },
            date: {
              type: 'string',
              format: 'date',
              description: 'Reminder date',
              example: '2025-12-20',
            },
            km: {
              type: 'integer',
              description: 'Reminder kilometer',
              example: 20000,
            },
            days_until: {
              type: 'integer',
              description: 'Days until reminder',
              example: 4,
            },
            km_until: {
              type: 'integer',
              description: 'Kilometers until reminder',
              example: 500,
            },
          },
        },
        RecentActivity: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Activity ID',
              example: 1,
            },
            type: {
              type: 'string',
              enum: ['fuel', 'maintenance'],
              description: 'Activity type',
              example: 'fuel',
            },
            vehicle: {
              type: 'string',
              description: 'Vehicle description',
              example: 'Honda Civic - ABC-1234',
            },
            date: {
              type: 'string',
              format: 'date',
              description: 'Activity date',
              example: '2025-12-14',
            },
            cost: {
              type: 'number',
              format: 'float',
              description: 'Activity cost',
              example: 315.00,
            },
            description: {
              type: 'string',
              description: 'Activity description',
              example: 'Abastecimento de 45.0L',
            },
            fuel_type: {
              type: 'string',
              description: 'Fuel type (only for fuel activities)',
              example: 'gasoline',
            },
          },
        },
        DashboardKPIs: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'object',
              properties: {
                total_vehicles: {
                  type: 'object',
                  properties: {
                    value: {
                      type: 'integer',
                      description: 'Total active vehicles',
                      example: 12,
                    },
                    change_this_month: {
                      type: 'integer',
                      description: 'Vehicles added this month',
                      example: 2,
                    },
                    change_percent: {
                      type: 'number',
                      format: 'float',
                      description: 'Percentage change vs last month',
                      example: 20.0,
                    },
                  },
                },
                pending_maintenances: {
                  type: 'object',
                  properties: {
                    value: {
                      type: 'integer',
                      description: 'Number of pending maintenances',
                      example: 5,
                    },
                    change_this_month: {
                      type: 'integer',
                      description: 'Change in pending maintenances this month',
                      example: -3,
                    },
                    change_percent: {
                      type: 'number',
                      format: 'float',
                      description: 'Percentage change vs last month',
                      example: -37.5,
                    },
                  },
                },
                fuel_records_this_month: {
                  type: 'object',
                  properties: {
                    value: {
                      type: 'integer',
                      description: 'Number of fuel records this month',
                      example: 28,
                    },
                    change_percent: {
                      type: 'number',
                      format: 'float',
                      description: 'Percentage change vs last month',
                      example: 8.0,
                    },
                    total_cost: {
                      type: 'number',
                      format: 'float',
                      description: 'Total fuel cost this month',
                      example: 1450.50,
                    },
                  },
                },
                avg_cost_per_km: {
                  type: 'object',
                  properties: {
                    value: {
                      type: 'number',
                      format: 'float',
                      description: 'Average cost per kilometer',
                      example: 0.85,
                    },
                    avg_consumption: {
                      type: 'number',
                      format: 'float',
                      nullable: true,
                      description: 'Average fuel consumption (km/L)',
                      example: 12.5,
                    },
                    avg_price_per_liter: {
                      type: 'number',
                      format: 'float',
                      nullable: true,
                      description: 'Average fuel price per liter',
                      example: 5.89,
                    },
                  },
                },
              },
            },
          },
        },
        DashboardOverview: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'object',
              properties: {
                expenses: {
                  type: 'object',
                  properties: {
                    monthly: {
                      type: 'array',
                      items: {
                        $ref: '#/components/schemas/MonthlyExpense',
                      },
                    },
                    totals: {
                      $ref: '#/components/schemas/ExpensesTotals',
                    },
                  },
                },
                recent_activities: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/RecentActivity',
                  },
                },
                upcoming_maintenances: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/UpcomingMaintenance',
                  },
                },
                total_vehicles: {
                  type: 'integer',
                  description: 'Total active vehicles',
                  example: 2,
                },
              },
            },
          },
        },
        Maintenance: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Maintenance ID',
              example: 1,
            },
            vehicle_id: {
              type: 'integer',
              description: 'Vehicle ID',
              example: 5,
            },
            service_provider_id: {
              type: 'integer',
              description: 'Service provider ID',
              example: 2,
            },
            type: {
              type: 'string',
              description: 'Maintenance type',
              example: 'Troca de óleo',
            },
            category: {
              type: 'string',
              enum: ['preventive', 'corrective', 'inspection', 'upgrade', 'warranty', 'recall', 'other'],
              description: 'Maintenance category',
              example: 'preventive',
            },
            description: {
              type: 'string',
              description: 'Maintenance description',
              example: 'Troca de óleo sintético 5W-30',
            },
            cost: {
              type: 'number',
              format: 'float',
              description: 'Maintenance cost',
              example: 280.00,
            },
            km_at_service: {
              type: 'integer',
              description: 'Kilometer reading at service',
              example: 15000,
            },
            service_date: {
              type: 'string',
              format: 'date',
              description: 'Service date',
              example: '2025-12-15',
            },
            next_service_km: {
              type: 'integer',
              description: 'Next service kilometer',
              example: 20000,
            },
            next_service_date: {
              type: 'string',
              format: 'date',
              description: 'Next service date',
              example: '2026-06-15',
            },
            invoice_number: {
              type: 'string',
              description: 'Invoice number',
              example: 'NF-12345',
            },
            warranty_until: {
              type: 'string',
              format: 'date',
              description: 'Warranty expiration date',
              example: '2026-12-15',
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
        MaintenanceCreate: {
          type: 'object',
          required: ['vehicle_id', 'type', 'description', 'cost', 'service_date', 'km_at_service'],
          properties: {
            vehicle_id: {
              type: 'integer',
              description: 'Vehicle ID',
              example: 5,
            },
            service_provider_id: {
              type: 'integer',
              description: 'Service provider ID (optional)',
              example: 2,
            },
            type: {
              type: 'string',
              description: 'Maintenance type',
              example: 'Troca de óleo',
            },
            category: {
              type: 'string',
              enum: ['preventive', 'corrective', 'inspection', 'upgrade', 'warranty', 'recall', 'other'],
              description: 'Maintenance category (optional, default: other)',
              example: 'preventive',
            },
            description: {
              type: 'string',
              description: 'Maintenance description',
              example: 'Troca de óleo sintético 5W-30',
            },
            cost: {
              type: 'number',
              format: 'float',
              description: 'Maintenance cost',
              example: 280.00,
            },
            km_at_service: {
              type: 'integer',
              description: 'Kilometer reading at service',
              example: 15000,
            },
            service_date: {
              type: 'string',
              format: 'date',
              description: 'Service date',
              example: '2025-12-15',
            },
            next_service_km: {
              type: 'integer',
              description: 'Next service kilometer (optional)',
              example: 20000,
            },
            next_service_date: {
              type: 'string',
              format: 'date',
              description: 'Next service date (optional)',
              example: '2026-06-15',
            },
            invoice_number: {
              type: 'string',
              description: 'Invoice number (optional)',
              example: 'NF-12345',
            },
            warranty_until: {
              type: 'string',
              format: 'date',
              description: 'Warranty expiration date (optional)',
              example: '2026-12-15',
            },
          },
        },
        MaintenanceUpdate: {
          type: 'object',
          required: ['type', 'service_date'],
          properties: {
            service_provider_id: {
              type: 'integer',
              description: 'Service provider ID (optional)',
              example: 2,
            },
            type: {
              type: 'string',
              description: 'Maintenance type',
              example: 'Troca de óleo',
            },
            category: {
              type: 'string',
              enum: ['preventive', 'corrective', 'inspection', 'upgrade', 'warranty', 'recall', 'other'],
              description: 'Maintenance category (optional)',
              example: 'preventive',
            },
            description: {
              type: 'string',
              description: 'Maintenance description (optional)',
              example: 'Troca de óleo sintético 5W-30',
            },
            cost: {
              type: 'number',
              format: 'float',
              description: 'Maintenance cost (optional)',
              example: 280.00,
            },
            km_at_service: {
              type: 'integer',
              description: 'Kilometer reading at service (optional)',
              example: 15000,
            },
            service_date: {
              type: 'string',
              format: 'date',
              description: 'Service date',
              example: '2025-12-15',
            },
            next_service_km: {
              type: 'integer',
              description: 'Next service kilometer (optional)',
              example: 20000,
            },
            next_service_date: {
              type: 'string',
              format: 'date',
              description: 'Next service date (optional)',
              example: '2026-06-15',
            },
            invoice_number: {
              type: 'string',
              description: 'Invoice number (optional)',
              example: 'NF-12345',
            },
            warranty_until: {
              type: 'string',
              format: 'date',
              description: 'Warranty expiration date (optional)',
              example: '2026-12-15',
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
