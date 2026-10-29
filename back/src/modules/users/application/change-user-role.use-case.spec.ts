import { RequestContextService } from '../../../common/context/request-context.service';
import {
  BusinessRuleViolationException,
  ResourceNotFoundException,
} from '../../../common/exceptions/app-exceptions';
import { AuditService } from '../../audit/application/audit.service';
import { AuditLogRecord } from '../../audit/domain/audit-log-repository.port';
import { AuthenticationSource } from '../domain/authentication-source.enum';
import { User } from '../domain/user';
import { UserRole } from '../domain/user-role.enum';
import { UserRepositoryPort } from '../domain/user-repository.port';
import { ChangeUserRoleUseCase } from './change-user-role.use-case';

const buildUser = (id: string, role: UserRole, isActive = true): User =>
  new User(
    id,
    `${id}@local.dev`,
    'Utilisateur',
    role,
    'hash',
    AuthenticationSource.Local,
    isActive,
    null,
    new Date(),
    new Date(),
    null,
  );

describe('ChangeUserRoleUseCase', () => {
  let users: Map<string, User>;
  let activeAdminCount: number;
  let roleUpdates: Array<{ id: string; role: UserRole }>;
  let auditedActions: string[];
  let useCase: ChangeUserRoleUseCase;

  beforeEach(() => {
    users = new Map();
    activeAdminCount = 2;
    roleUpdates = [];
    auditedActions = [];

    const repository = {
      findById: (id: string) => Promise.resolve(users.get(id) ?? null),
      updateRole: (id: string, role: UserRole) => {
        roleUpdates.push({ id, role });
        return Promise.resolve();
      },
      countActiveByRole: () => Promise.resolve(activeAdminCount),
    } as unknown as UserRepositoryPort;

    const auditService = new AuditService(
      {
        insert: (record: AuditLogRecord) => {
          auditedActions.push(record.action);
          return Promise.resolve();
        },
      },
      new RequestContextService(),
    );

    useCase = new ChangeUserRoleUseCase(repository, auditService);
  });

  it('change le rôle et audite', async () => {
    users.set('cible', buildUser('cible', UserRole.Employee));

    await useCase.execute('cible', UserRole.Direction, 'acteur');

    expect(roleUpdates).toEqual([{ id: 'cible', role: UserRole.Direction }]);
    expect(auditedActions).toContain('user.role.changed');
  });

  it('refuse la modification de son propre rôle', async () => {
    await expect(
      useCase.execute('acteur', UserRole.Employee, 'acteur'),
    ).rejects.toBeInstanceOf(BusinessRuleViolationException);
    expect(roleUpdates).toHaveLength(0);
  });

  it('refuse de rétrograder le dernier administrateur actif', async () => {
    users.set('cible', buildUser('cible', UserRole.Admin));
    activeAdminCount = 1;

    await expect(
      useCase.execute('cible', UserRole.Employee, 'acteur'),
    ).rejects.toBeInstanceOf(BusinessRuleViolationException);
    expect(roleUpdates).toHaveLength(0);
  });

  it('autorise la rétrogradation d’un administrateur s’il en reste un autre actif', async () => {
    users.set('cible', buildUser('cible', UserRole.Admin));
    activeAdminCount = 2;

    await useCase.execute('cible', UserRole.Direction, 'acteur');

    expect(roleUpdates).toEqual([{ id: 'cible', role: UserRole.Direction }]);
  });

  it('est sans effet si le rôle demandé est déjà porté', async () => {
    users.set('cible', buildUser('cible', UserRole.Direction));

    await useCase.execute('cible', UserRole.Direction, 'acteur');

    expect(roleUpdates).toHaveLength(0);
    expect(auditedActions).toHaveLength(0);
  });

  it('lève RESOURCE_NOT_FOUND pour une cible inconnue', async () => {
    await expect(
      useCase.execute('inconnu', UserRole.Direction, 'acteur'),
    ).rejects.toBeInstanceOf(ResourceNotFoundException);
  });
});
