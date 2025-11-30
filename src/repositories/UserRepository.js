const { AppDataSource } = require('../config/typeorm');

/**
 * UserRepository - Exemplo de uso do TypeORM Repository Pattern
 *
 * Este repositório demonstra como usar TypeORM para:
 * - Realizar operações CRUD
 * - Usar query builder
 * - Fazer relacionamentos
 * - Aplicar filtros e paginação
 */
class UserRepository {
  constructor() {
    this.repository = AppDataSource.getRepository('User');
  }

  /**
   * Criar novo usuário
   */
  async create(userData) {
    const user = this.repository.create(userData);
    return await this.repository.save(user);
  }

  /**
   * Buscar usuário por ID (com relacionamentos)
   */
  async findById(id, withRelations = false) {
    const options = { where: { id } };

    if (withRelations) {
      options.relations = ['preferences', 'vehicles', 'serviceProviders'];
    }

    return await this.repository.findOne(options);
  }

  /**
   * Buscar usuário por email
   */
  async findByEmail(email) {
    return await this.repository.findOne({
      where: { email }
    });
  }

  /**
   * Buscar usuário por username
   */
  async findByUsername(username) {
    return await this.repository.findOne({
      where: { username }
    });
  }

  /**
   * Buscar usuário por email ou username
   */
  async findByEmailOrUsername(emailOrUsername) {
    return await this.repository
      .createQueryBuilder('user')
      .where('user.email = :value OR user.username = :value', {
        value: emailOrUsername
      })
      .getOne();
  }

  /**
   * Listar todos os usuários com paginação
   */
  async findAll(options = {}) {
    const {
      page = 1,
      limit = 10,
      status = 'active',
      role = null
    } = options;

    const queryBuilder = this.repository
      .createQueryBuilder('user')
      .where('user.status = :status', { status })
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('user.created_at', 'DESC');

    if (role) {
      queryBuilder.andWhere('user.role = :role', { role });
    }

    const [users, total] = await queryBuilder.getManyAndCount();

    return {
      data: users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Atualizar usuário
   */
  async update(id, updateData) {
    await this.repository.update(id, updateData);
    return await this.findById(id);
  }

  /**
   * Soft delete - marcar como deleted
   */
  async softDelete(id) {
    return await this.repository.update(id, {
      deleted_at: new Date(),
      status: 'deleted'
    });
  }

  /**
   * Hard delete - excluir permanentemente
   */
  async hardDelete(id) {
    return await this.repository.delete(id);
  }

  /**
   * Contar usuários por role
   */
  async countByRole(role) {
    return await this.repository.count({
      where: { role, status: 'active' }
    });
  }

  /**
   * Buscar usuários com veículos
   */
  async findUsersWithVehicles() {
    return await this.repository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.vehicles', 'vehicle')
      .where('vehicle.is_active = :isActive', { isActive: true })
      .getMany();
  }

  /**
   * Atualizar último login
   */
  async updateLastLogin(id) {
    return await this.repository.update(id, {
      last_login_at: new Date()
    });
  }

  /**
   * Incrementar tentativas de login
   */
  async incrementLoginAttempts(id) {
    return await this.repository
      .createQueryBuilder()
      .update('User')
      .set({
        login_attempts: () => 'login_attempts + 1'
      })
      .where('id = :id', { id })
      .execute();
  }

  /**
   * Resetar tentativas de login
   */
  async resetLoginAttempts(id) {
    return await this.repository.update(id, {
      login_attempts: 0,
      locked_until: null
    });
  }

  /**
   * Bloquear usuário temporariamente
   */
  async lockUser(id, minutes = 15) {
    const lockedUntil = new Date();
    lockedUntil.setMinutes(lockedUntil.getMinutes() + minutes);

    return await this.repository.update(id, {
      locked_until: lockedUntil
    });
  }

  /**
   * Verificar se usuário está bloqueado
   */
  async isLocked(id) {
    const user = await this.findById(id);
    if (!user || !user.locked_until) return false;

    return new Date() < new Date(user.locked_until);
  }
}

module.exports = new UserRepository();
