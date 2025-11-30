const { AppDataSource } = require('../config/typeorm');

/**
 * VehicleRepository - Exemplo de uso do TypeORM com relacionamentos
 *
 * Demonstra:
 * - Operações CRUD
 * - Relacionamentos complexos
 * - Filtros avançados
 * - Agregações e estatísticas
 */
class VehicleRepository {
  constructor() {
    this.repository = AppDataSource.getRepository('Vehicle');
  }

  /**
   * Criar novo veículo
   */
  async create(vehicleData) {
    const vehicle = this.repository.create(vehicleData);
    return await this.repository.save(vehicle);
  }

  /**
   * Buscar veículo por ID (com relacionamentos opcionais)
   */
  async findById(id, withRelations = false) {
    const options = { where: { id } };

    if (withRelations) {
      options.relations = [
        'user',
        'maintenances',
        'maintenances.attachments',
        'fuelRecords',
        'reminders'
      ];
    }

    return await this.repository.findOne(options);
  }

  /**
   * Buscar veículo por placa
   */
  async findByPlate(plate) {
    return await this.repository.findOne({
      where: { plate }
    });
  }

  /**
   * Listar veículos do usuário
   */
  async findByUserId(userId, options = {}) {
    const {
      isActive = true,
      page = 1,
      limit = 10
    } = options;

    const queryBuilder = this.repository
      .createQueryBuilder('vehicle')
      .where('vehicle.user_id = :userId', { userId })
      .andWhere('vehicle.is_active = :isActive', { isActive })
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('vehicle.created_at', 'DESC');

    const [vehicles, total] = await queryBuilder.getManyAndCount();

    return {
      data: vehicles,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Buscar veículos ativos do usuário
   */
  async findActiveByUserId(userId) {
    return await this.repository.find({
      where: {
        user_id: userId,
        is_active: true
      },
      order: {
        created_at: 'DESC'
      }
    });
  }

  /**
   * Buscar veículos inativos do usuário
   */
  async findInactiveByUserId(userId) {
    return await this.repository.find({
      where: {
        user_id: userId,
        is_active: false
      },
      order: {
        created_at: 'DESC'
      }
    });
  }

  /**
   * Atualizar veículo
   */
  async update(id, updateData) {
    await this.repository.update(id, updateData);
    return await this.findById(id);
  }

  /**
   * Inativar veículo (soft delete)
   */
  async inactivate(id) {
    return await this.repository.update(id, {
      is_active: false
    });
  }

  /**
   * Reativar veículo
   */
  async reactivate(id) {
    return await this.repository.update(id, {
      is_active: true
    });
  }

  /**
   * Excluir veículo permanentemente
   */
  async delete(id) {
    return await this.repository.delete(id);
  }

  /**
   * Atualizar quilometragem
   */
  async updateKm(id, newKm) {
    return await this.repository.update(id, {
      current_km: newKm
    });
  }

  /**
   * Buscar veículos com manutenções pendentes
   */
  async findWithPendingMaintenances(userId) {
    return await this.repository
      .createQueryBuilder('vehicle')
      .leftJoinAndSelect('vehicle.maintenances', 'maintenance')
      .where('vehicle.user_id = :userId', { userId })
      .andWhere('maintenance.is_completed = :completed', { completed: false })
      .getMany();
  }

  /**
   * Buscar veículos com lembretes pendentes
   */
  async findWithPendingReminders(userId) {
    return await this.repository
      .createQueryBuilder('vehicle')
      .leftJoinAndSelect('vehicle.reminders', 'reminder')
      .where('vehicle.user_id = :userId', { userId })
      .andWhere('reminder.status = :status', { status: 'pending' })
      .getMany();
  }

  /**
   * Estatísticas do veículo
   */
  async getStatistics(vehicleId) {
    const vehicle = await this.findById(vehicleId, true);
    if (!vehicle) return null;

    // Total de manutenções
    const totalMaintenances = vehicle.maintenances?.length || 0;

    // Custo total de manutenções
    const totalMaintenanceCost = vehicle.maintenances?.reduce(
      (sum, m) => sum + parseFloat(m.cost || 0),
      0
    ) || 0;

    // Manutenções pendentes
    const pendingMaintenances = vehicle.maintenances?.filter(
      m => !m.is_completed
    ).length || 0;

    // Total de abastecimentos
    const totalFuelRecords = vehicle.fuelRecords?.length || 0;

    // Custo total de combustível
    const totalFuelCost = vehicle.fuelRecords?.reduce(
      (sum, f) => sum + parseFloat(f.total_cost || 0),
      0
    ) || 0;

    // Lembretes pendentes
    const pendingReminders = vehicle.reminders?.filter(
      r => r.status === 'pending'
    ).length || 0;

    return {
      vehicle: {
        id: vehicle.id,
        brand: vehicle.brand,
        model: vehicle.model,
        year: vehicle.year,
        plate: vehicle.plate,
        current_km: vehicle.current_km
      },
      statistics: {
        total_maintenances: totalMaintenances,
        pending_maintenances: pendingMaintenances,
        total_maintenance_cost: totalMaintenanceCost,
        total_fuel_records: totalFuelRecords,
        total_fuel_cost: totalFuelCost,
        pending_reminders: pendingReminders
      }
    };
  }

  /**
   * Contar veículos por usuário
   */
  async countByUserId(userId, isActive = true) {
    return await this.repository.count({
      where: {
        user_id: userId,
        is_active: isActive
      }
    });
  }

  /**
   * Buscar veículos por marca
   */
  async findByBrand(brand) {
    return await this.repository.find({
      where: { brand },
      order: { model: 'ASC' }
    });
  }

  /**
   * Buscar veículos por ano
   */
  async findByYear(year) {
    return await this.repository.find({
      where: { year },
      order: { brand: 'ASC', model: 'ASC' }
    });
  }
}

module.exports = new VehicleRepository();
