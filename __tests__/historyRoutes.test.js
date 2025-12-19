const request = require('supertest');
const app = require('../src/app');
const { AppDataSource } = require('../src/config/typeorm');
const { generateTestUsername, generateTestEmail, generateTestPlate } = require('./helpers/testUtils');

// TypeORM Repositories
const userRepository = AppDataSource.getRepository('User');
const vehicleRepository = AppDataSource.getRepository('Vehicle');
const maintenanceRepository = AppDataSource.getRepository('Maintenance');
const fuelRecordRepository = AppDataSource.getRepository('FuelRecord');
const serviceProviderRepository = AppDataSource.getRepository('ServiceProvider');

describe('History Routes API', () => {
  let userId, otherUserId;
  let userToken, otherUserToken;
  let testVehicle1, testVehicle2, otherUserVehicle;
  let testMaintenance1, testMaintenance2;
  let testFuelRecord1, testFuelRecord2;
  let testServiceProvider;

  beforeAll(async () => {
    // Create main test user
    const testUsername = generateTestUsername('historyuser');
    const testEmail = generateTestEmail('historyuser');

    const userResponse = await request(app)
      .post('/api/users/register')
      .send({
        username: testUsername,
        email: testEmail,
        password: 'Test@123',
        first_name: 'History',
        last_name: 'Test'
      });

    if (!userResponse.body.user) {
      throw new Error('User registration failed');
    }

    userId = userResponse.body.user.id;
    userToken = userResponse.body.token;

    // Create other user for permission tests
    const otherUsername = generateTestUsername('otheruser');
    const otherEmail = generateTestEmail('otheruser');

    const otherUserResponse = await request(app)
      .post('/api/users/register')
      .send({
        username: otherUsername,
        email: otherEmail,
        password: 'Test@123',
        first_name: 'Other',
        last_name: 'User'
      });

    otherUserId = otherUserResponse.body.user.id;
    otherUserToken = otherUserResponse.body.token;

    // Create service provider
    const providerResponse = await request(app)
      .post('/api/service-providers')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'Oficina Teste',
        type: 'oficina',
        phone: '11999999999'
      });

    testServiceProvider = providerResponse.body.data;

    // Create test vehicles
    const testPlate1 = generateTestPlate('mercosul');
    const vehicleResponse1 = await request(app)
      .post('/api/vehicles')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        brand: 'Toyota',
        model: 'Corolla',
        year: 2020,
        plate: testPlate1,
        color: 'Branco',
        current_km: 15000,
        purchase_date: '2020-01-15'
      });

    testVehicle1 = vehicleResponse1.body.data;

    const testPlate2 = generateTestPlate('mercosul');
    const vehicleResponse2 = await request(app)
      .post('/api/vehicles')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        brand: 'Honda',
        model: 'Civic',
        year: 2019,
        plate: testPlate2,
        color: 'Preto',
        current_km: 25000,
        purchase_date: '2019-06-20'
      });

    testVehicle2 = vehicleResponse2.body.data;

    // Create vehicle for other user
    const otherPlate = generateTestPlate('mercosul');
    const otherVehicleResponse = await request(app)
      .post('/api/vehicles')
      .set('Authorization', `Bearer ${otherUserToken}`)
      .send({
        brand: 'Ford',
        model: 'Focus',
        year: 2018,
        plate: otherPlate,
        color: 'Azul',
        current_km: 30000
      });

    otherUserVehicle = otherVehicleResponse.body.data;

    // Create test maintenances
    const maintenance1Response = await request(app)
      .post('/api/maintenances')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        vehicle_id: testVehicle1.id,
        type: 'Troca de óleo',
        category: 'preventive',
        description: 'Troca de óleo e filtro',
        cost: 250.00,
        service_date: '2024-06-15',
        km_at_service: 10000,
        service_provider_id: testServiceProvider.id
      });

    testMaintenance1 = maintenance1Response.body.data;

    const maintenance2Response = await request(app)
      .post('/api/maintenances')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        vehicle_id: testVehicle1.id,
        type: 'Troca de pastilhas',
        category: 'corrective',
        description: 'Troca de pastilhas de freio',
        cost: 800.00,
        service_date: '2024-11-20',
        km_at_service: 14000
      });

    testMaintenance2 = maintenance2Response.body.data;

    // Create test fuel records
    const fuel1Response = await request(app)
      .post('/api/fuel-records')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        vehicle_id: testVehicle1.id,
        date: '2024-07-01',
        km: 10500,
        liters: 45.0,
        price_per_liter: 5.50,
        total_cost: 247.50,
        fuel_type: 'gasoline',
        is_full_tank: true,
        gas_station: 'Posto Shell'
      });

    testFuelRecord1 = fuel1Response.body.data;

    const fuel2Response = await request(app)
      .post('/api/fuel-records')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        vehicle_id: testVehicle1.id,
        date: '2024-12-01',
        km: 14800,
        liters: 42.0,
        price_per_liter: 6.00,
        total_cost: 252.00,
        fuel_type: 'gasoline',
        is_full_tank: true,
        gas_station: 'Posto Ipiranga'
      });

    testFuelRecord2 = fuel2Response.body.data;

    // Create records for vehicle 2
    await request(app)
      .post('/api/maintenances')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        vehicle_id: testVehicle2.id,
        type: 'Revisão',
        category: 'inspection',
        description: 'Revisão dos 25 mil km',
        cost: 350.00,
        service_date: '2024-10-10',
        km_at_service: 25000
      });

    await request(app)
      .post('/api/fuel-records')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        vehicle_id: testVehicle2.id,
        date: '2024-10-15',
        km: 25200,
        liters: 50.0,
        price_per_liter: 5.80,
        total_cost: 290.00,
        fuel_type: 'gasoline',
        is_full_tank: true
      });
  });

  afterAll(async () => {
    // Clean test data
    if (testVehicle1) {
      await fuelRecordRepository.delete({ vehicle_id: testVehicle1.id });
      await maintenanceRepository.delete({ vehicle_id: testVehicle1.id });
      await vehicleRepository.delete(testVehicle1.id);
    }
    if (testVehicle2) {
      await fuelRecordRepository.delete({ vehicle_id: testVehicle2.id });
      await maintenanceRepository.delete({ vehicle_id: testVehicle2.id });
      await vehicleRepository.delete(testVehicle2.id);
    }
    if (otherUserVehicle) {
      await fuelRecordRepository.delete({ vehicle_id: otherUserVehicle.id });
      await maintenanceRepository.delete({ vehicle_id: otherUserVehicle.id });
      await vehicleRepository.delete(otherUserVehicle.id);
    }
    if (testServiceProvider) {
      await serviceProviderRepository.delete(testServiceProvider.id);
    }
    await userRepository.delete([userId, otherUserId]);
  });

  describe('GET /api/history', () => {
    test('Should get unified history successfully', async () => {
      const response = await request(app)
        .get('/api/history')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('items');
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data).toHaveProperty('filters_applied');
      expect(Array.isArray(response.body.data.items)).toBe(true);
      expect(response.body.data.items.length).toBeGreaterThan(0);

      // Check item structure
      const firstItem = response.body.data.items[0];
      expect(firstItem).toHaveProperty('type');
      expect(['maintenance', 'fuel']).toContain(firstItem.type);
      expect(firstItem).toHaveProperty('date');
      expect(firstItem).toHaveProperty('cost');
    });

    test('Should filter by vehicle_id', async () => {
      const response = await request(app)
        .get('/api/history')
        .query({ vehicle_id: testVehicle1.id })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items.every(item => item.vehicle_id === testVehicle1.id)).toBe(true);
      expect(response.body.data.filters_applied.vehicle_id).toBe(testVehicle1.id);
    });

    test('Should filter by type=maintenance', async () => {
      const response = await request(app)
        .get('/api/history')
        .query({ type: 'maintenance' })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items.every(item => item.type === 'maintenance')).toBe(true);
    });

    test('Should filter by type=fuel', async () => {
      const response = await request(app)
        .get('/api/history')
        .query({ type: 'fuel' })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items.every(item => item.type === 'fuel')).toBe(true);
    });

    test('Should filter by category', async () => {
      const response = await request(app)
        .get('/api/history')
        .query({ type: 'maintenance', category: 'preventive' })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const maintenanceItems = response.body.data.items.filter(item => item.type === 'maintenance');
      expect(maintenanceItems.every(item => item.category === 'preventive')).toBe(true);
    });

    test('Should filter by fuel_type', async () => {
      const response = await request(app)
        .get('/api/history')
        .query({ type: 'fuel', fuel_type: 'gasoline' })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const fuelItems = response.body.data.items.filter(item => item.type === 'fuel');
      expect(fuelItems.every(item => item.fuel_type === 'gasoline')).toBe(true);
    });

    test('Should filter by date range', async () => {
      const response = await request(app)
        .get('/api/history')
        .query({
          start_date: '2024-07-01',
          end_date: '2024-12-31'
        })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.filters_applied.start_date).toBe('2024-07-01');
      expect(response.body.data.filters_applied.end_date).toBe('2024-12-31');
    });

    test('Should filter by cost range', async () => {
      const response = await request(app)
        .get('/api/history')
        .query({
          min_cost: 200,
          max_cost: 300
        })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items.every(item => item.cost >= 200 && item.cost <= 300)).toBe(true);
    });

    test('Should sort by cost descending', async () => {
      const response = await request(app)
        .get('/api/history')
        .query({
          sort_by: 'cost',
          sort_order: 'desc'
        })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const costs = response.body.data.items.map(item => parseFloat(item.cost));
      for (let i = 1; i < costs.length; i++) {
        expect(costs[i - 1]).toBeGreaterThanOrEqual(costs[i]);
      }
    });

    test('Should paginate results', async () => {
      const response = await request(app)
        .get('/api/history')
        .query({
          limit: 2,
          offset: 0
        })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pagination.limit).toBe(2);
      expect(response.body.data.pagination.offset).toBe(0);
      expect(response.body.data.items.length).toBeLessThanOrEqual(2);
    });

    test('Should reject invalid type', async () => {
      const response = await request(app)
        .get('/api/history')
        .query({ type: 'invalid' })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('Should reject invalid date format', async () => {
      const response = await request(app)
        .get('/api/history')
        .query({ start_date: 'invalid-date' })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('Should reject start_date > end_date', async () => {
      const response = await request(app)
        .get('/api/history')
        .query({
          start_date: '2024-12-31',
          end_date: '2024-01-01'
        })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('Should reject limit > 200', async () => {
      const response = await request(app)
        .get('/api/history')
        .query({ limit: 250 })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('Should require authentication', async () => {
      const response = await request(app)
        .get('/api/history')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/history/statistics', () => {
    test('Should get statistics successfully', async () => {
      const response = await request(app)
        .get('/api/history/statistics')
        .query({
          start_date: '2024-01-01',
          end_date: '2024-12-31'
        })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('period');
      expect(response.body.data).toHaveProperty('total_costs');
      expect(response.body.data).toHaveProperty('cost_per_km');
      expect(response.body.data).toHaveProperty('maintenance_stats');
      expect(response.body.data).toHaveProperty('fuel_stats');
      expect(response.body.data).toHaveProperty('projections');

      // Check period structure
      expect(response.body.data.period).toHaveProperty('start_date');
      expect(response.body.data.period).toHaveProperty('end_date');
      expect(response.body.data.period).toHaveProperty('days');
      expect(response.body.data.period).toHaveProperty('km_traveled');

      // Check total_costs structure
      expect(response.body.data.total_costs).toHaveProperty('total');
      expect(response.body.data.total_costs).toHaveProperty('maintenance');
      expect(response.body.data.total_costs).toHaveProperty('fuel');
      expect(response.body.data.total_costs).toHaveProperty('maintenance_percentage');
      expect(response.body.data.total_costs).toHaveProperty('fuel_percentage');

      // Check maintenance_stats structure
      expect(response.body.data.maintenance_stats).toHaveProperty('total_services');
      expect(response.body.data.maintenance_stats).toHaveProperty('average_cost');
      expect(response.body.data.maintenance_stats).toHaveProperty('by_category');

      // Check fuel_stats structure
      expect(response.body.data.fuel_stats).toHaveProperty('total_refuels');
      expect(response.body.data.fuel_stats).toHaveProperty('total_liters');
      expect(response.body.data.fuel_stats).toHaveProperty('by_fuel_type');

      // Check projections structure
      expect(response.body.data.projections).toHaveProperty('monthly_average');
      expect(response.body.data.projections).toHaveProperty('next_3_months_estimate');
      expect(response.body.data.projections).toHaveProperty('cost_per_km_trend');
    });

    test('Should filter statistics by vehicle_id', async () => {
      const response = await request(app)
        .get('/api/history/statistics')
        .query({
          vehicle_id: testVehicle1.id,
          start_date: '2024-01-01',
          end_date: '2024-12-31'
        })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.total_costs.total).toBeGreaterThan(0);
    });

    test('Should use predefined period last_6_months', async () => {
      const response = await request(app)
        .get('/api/history/statistics')
        .query({ period: 'last_6_months' })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.period).toHaveProperty('start_date');
      expect(response.body.data.period).toHaveProperty('end_date');
    });

    test('Should calculate cost per km correctly', async () => {
      const response = await request(app)
        .get('/api/history/statistics')
        .query({
          vehicle_id: testVehicle1.id,
          start_date: '2024-01-01',
          end_date: '2024-12-31'
        })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const { total_costs, cost_per_km, period } = response.body.data;

      if (period.km_traveled > 0) {
        expect(cost_per_km.total).toBeGreaterThan(0);
        expect(cost_per_km.maintenance).toBeGreaterThanOrEqual(0);
        expect(cost_per_km.fuel).toBeGreaterThanOrEqual(0);
      }
    });

    test('Should reject invalid period', async () => {
      const response = await request(app)
        .get('/api/history/statistics')
        .query({ period: 'invalid_period' })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('Should require authentication', async () => {
      const response = await request(app)
        .get('/api/history/statistics')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/history/compare-vehicles', () => {
    test('Should compare vehicles successfully', async () => {
      const response = await request(app)
        .get('/api/history/compare-vehicles')
        .query({
          vehicle_ids: `${testVehicle1.id},${testVehicle2.id}`,
          start_date: '2024-01-01',
          end_date: '2024-12-31'
        })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('period');
      expect(response.body.data).toHaveProperty('vehicles');
      expect(response.body.data).toHaveProperty('summary');

      // Check vehicles array
      expect(Array.isArray(response.body.data.vehicles)).toBe(true);
      expect(response.body.data.vehicles.length).toBe(2);

      // Check vehicle structure
      const vehicle = response.body.data.vehicles[0];
      expect(vehicle).toHaveProperty('vehicle_id');
      expect(vehicle).toHaveProperty('name');
      expect(vehicle).toHaveProperty('km_traveled');
      expect(vehicle).toHaveProperty('total_cost');
      expect(vehicle).toHaveProperty('cost_per_km');
      expect(vehicle).toHaveProperty('maintenance_cost');
      expect(vehicle).toHaveProperty('fuel_cost');
      expect(vehicle).toHaveProperty('services_count');
      expect(vehicle).toHaveProperty('efficiency_rank');

      // Check summary structure
      expect(response.body.data.summary).toHaveProperty('most_economical');
      expect(response.body.data.summary).toHaveProperty('most_expensive');
      expect(response.body.data.summary.most_economical).toHaveProperty('vehicle_id');
      expect(response.body.data.summary.most_economical).toHaveProperty('cost_per_km');
    });

    test('Should rank vehicles by efficiency', async () => {
      const response = await request(app)
        .get('/api/history/compare-vehicles')
        .query({
          vehicle_ids: `${testVehicle1.id},${testVehicle2.id}`,
          period: 'last_6_months'
        })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const vehicles = response.body.data.vehicles;

      // Check that ranks are sequential
      expect(vehicles[0].efficiency_rank).toBe(1);
      expect(vehicles[1].efficiency_rank).toBe(2);

      // Check that vehicles are ordered by cost_per_km
      if (vehicles.length > 1) {
        expect(vehicles[0].cost_per_km).toBeLessThanOrEqual(vehicles[1].cost_per_km);
      }
    });

    test('Should reject less than 2 vehicles', async () => {
      const response = await request(app)
        .get('/api/history/compare-vehicles')
        .query({
          vehicle_ids: testVehicle1.id
        })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('2 veículos');
    });

    test('Should reject more than 5 vehicles', async () => {
      const response = await request(app)
        .get('/api/history/compare-vehicles')
        .query({
          vehicle_ids: '1,2,3,4,5,6'
        })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('5 veículos');
    });

    test('Should reject duplicate vehicle IDs', async () => {
      const response = await request(app)
        .get('/api/history/compare-vehicles')
        .query({
          vehicle_ids: `${testVehicle1.id},${testVehicle1.id}`
        })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('duplicados');
    });

    test('Should reject vehicles from other users', async () => {
      const response = await request(app)
        .get('/api/history/compare-vehicles')
        .query({
          vehicle_ids: `${testVehicle1.id},${otherUserVehicle.id}`
        })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });

    test('Should reject missing vehicle_ids', async () => {
      const response = await request(app)
        .get('/api/history/compare-vehicles')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('Should require authentication', async () => {
      const response = await request(app)
        .get('/api/history/compare-vehicles')
        .query({
          vehicle_ids: `${testVehicle1.id},${testVehicle2.id}`
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });
});
