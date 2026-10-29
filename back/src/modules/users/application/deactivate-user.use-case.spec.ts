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
import { DeactivateUserUseCase } from './deactivate-user.use-case';

const buildUser = (id: string, isActive: boolean): User =>
  new User(
    id,
    `${id}@local.dev`,
    'Utilisateur',
    UserRole.Employee,
    'hash',
    AuthenticationSource.Local,
    isActive,
    null,
    new Date(),
    new Date(),
    null,
  );

describe('DeactivateUserUseCase', () => {
  let users: Map<string, User>;
  let activationChanges: Array<{ id: string; isActive: boolean }>;
  let auditedActions: string[];
  let useCase: DeactivateUserUseCase;

  beforeEach(() => {
    users = new Map();
    activationChanges = [];
    auditedActions = [];

    const repository = {
      findById: (id: string) => Promise.resolve(users.get(id) ?? null),
      setActive: (id: string, isActive: boolean) => {
        activationChanges.push({ id, isActive });
        return Promise.resolve();
      },
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

    useCase = new DeactivateUserUseCase(repository, auditService);
  });

  it('désactive le compte cible et audite', async () => {
    users.set('cible', buildUser('cible', true));

    await useCase.execute('cible', 'acteur');

    expect(activationChanges).toEqual([{ id: 'cible', isActive: false }]);
    expect(auditedActions).toContain('user.deactivated');
  });

  it('refuse la désactivation de son propre compte', async () => {
    await expect(useCase.execute('acteur', 'acteur')).rejects.toBeInstanceOf(
      BusinessRuleViolationException,
    );
    expect(activationChanges).toHaveLength(0);
  });

  it('est idempotent sur un compte déjà désactivé', async () => {
    users.set('cible', buildUser('cible', false));

    await useCase.execute('cible', 'acteur');

    expect(activationChanges).toHaveLength(0);
    expect(auditedActions).toHaveLength(0);
  });

  it('lève RESOURCE_NOT_FOUND pour une cible inconnue', async () => {
    await expect(useCase.execute('inconnu', 'acteur')).rejects.toBeInstanceOf(
      ResourceNotFoundException,
    );
  });
});
