import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ColumnWhitelist,
  TypeOrmFilterHelper,
} from '../../../common/pagination/typeorm-filter.helper';
import { User } from '../domain/user';
import { UserRole } from '../domain/user-role.enum';
import {
  CreateUserInput,
  ListUsersQuery,
  UserRepositoryPort,
  UsersPage,
} from '../domain/user-repository.port';
import { UserEntity } from './entities/user.entity';
import { UserMapper } from './user.mapper';

/** Liste blanche du tri exposé par GET /users (contrat du front). */
const SORTABLE_COLUMNS: ColumnWhitelist = {
  displayName: 'user.displayName',
  role: 'user.role',
  isActive: 'user.isActive',
  createdAt: 'user.createdAt',
  email: 'user.email',
};

/** Colonnes couvertes par la recherche textuelle. */
const SEARCHABLE_COLUMNS = ['user.email', 'user.displayName'] as const;

/**
 * Implémentation TypeORM du repository utilisateurs.
 *
 * Les recherches standard excluent automatiquement les lignes
 * soft-deletées (comportement TypeORM avec @DeleteDateColumn).
 */
@Injectable()
export class TypeOrmUserRepository implements UserRepositoryPort {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repository: Repository<UserEntity>,
    private readonly mapper: UserMapper,
  ) {}

  async findById(id: string): Promise<User | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.mapper.toDomain(entity) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const entity = await this.repository.findOne({ where: { email } });
    return entity ? this.mapper.toDomain(entity) : null;
  }

  async findPage(query: ListUsersQuery): Promise<UsersPage> {
    const qb = this.repository.createQueryBuilder('user');

    TypeOrmFilterHelper.applySearch(qb, query.search, SEARCHABLE_COLUMNS);
    TypeOrmFilterHelper.applySort(
      qb,
      query.sortBy,
      query.sortDirection,
      SORTABLE_COLUMNS,
    );
    if (query.role !== undefined) {
      qb.andWhere('user.role = :role', { role: query.role });
    }
    if (query.isActive !== undefined) {
      qb.andWhere('user.isActive = :isActive', { isActive: query.isActive });
    }

    const [entities, totalItems] = await qb
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();

    return {
      items: entities.map((entity) => this.mapper.toDomain(entity)),
      totalItems,
    };
  }

  async create(input: CreateUserInput): Promise<User> {
    const entity = await this.repository.save(
      this.repository.create({
        email: input.email,
        displayName: input.displayName,
        role: input.role,
        passwordHash: input.passwordHash,
        authenticationSource: input.authenticationSource,
        isActive: true,
      }),
    );
    return this.mapper.toDomain(entity);
  }

  async updateRole(id: string, role: UserRole): Promise<void> {
    await this.repository.update({ id }, { role });
  }

  async setActive(id: string, isActive: boolean): Promise<void> {
    await this.repository.update({ id }, { isActive });
  }

  async updatePasswordHash(id: string, passwordHash: string): Promise<void> {
    await this.repository.update({ id }, { passwordHash });
  }

  async countActiveByRole(role: UserRole): Promise<number> {
    return this.repository.count({ where: { role, isActive: true } });
  }

  async updateLastLoginAt(id: string, lastLoginAt: Date): Promise<void> {
    await this.repository.update({ id }, { lastLoginAt });
  }
}
