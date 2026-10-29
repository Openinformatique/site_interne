import { RequestContextService } from '../../../common/context/request-context.service';
import { BusinessRuleViolationException } from '../../../common/exceptions/app-exceptions';
import { AuditService } from '../../audit/application/audit.service';
import { AuditLogRecord } from '../../audit/domain/audit-log-repository.port';
import { PasswordHasherPort } from '../../authentication/domain/password-hasher.port';
import { AuthenticationSource } from '../domain/authentication-source.enum';
import { User } from '../domain/user';
import { UserRole } from '../domain/user-role.enum';
import { UserRepositoryPort } from '../domain/user-repository.port';
import { ChangeOwnPasswordUseCase } from './change-own-password.use-case';

const buildUser = (passwordHash: string | null): User =>
  new User(
    'user-1',
    'user@local.dev',
    'Utilisateur',
    UserRole.Employee,
    passwordHash,
    AuthenticationSource.Local,
    true,
    null,
    new Date(),
    new Date(),
    null,
  );

/** Hasher factice déterministe : hash(x) = `hash(x)`. */
const fakeHasher: PasswordHasherPort = {
  hash: (plain) => Promise.resolve(`hash(${plain})`),
  verify: (hash, plain) => Promise.resolve(hash === `hash(${plain})`),
};

describe('ChangeOwnPasswordUseCase', () => {
  let currentUser: User | null;
  let hashUpdates: Array<{ id: string; hash: string }>;
  let auditedActions: string[];
  let useCase: ChangeOwnPasswordUseCase;

  beforeEach(() => {
    currentUser = buildUser('hash(ancien)');
    hashUpdates = [];
    auditedActions = [];

    const repository = {
      findById: () => Promise.resolve(currentUser),
      updatePasswordHash: (id: string, hash: string) => {
        hashUpdates.push({ id, hash });
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

    useCase = new ChangeOwnPasswordUseCase(
      repository,
      fakeHasher,
      auditService,
    );
  });

  it('remplace le hash quand le mot de passe actuel est correct', async () => {
    await useCase.execute('user-1', 'ancien', 'Nouveau1!');

    expect(hashUpdates).toEqual([{ id: 'user-1', hash: 'hash(Nouveau1!)' }]);
    expect(auditedActions).toContain('user.password.changed');
  });

  it('refuse un mot de passe actuel incorrect (409, aucun changement)', async () => {
    await expect(
      useCase.execute('user-1', 'mauvais', 'Nouveau1!'),
    ).rejects.toBeInstanceOf(BusinessRuleViolationException);
    expect(hashUpdates).toHaveLength(0);
    expect(auditedActions).toHaveLength(0);
  });

  it('refuse un compte sans mot de passe local (SSO)', async () => {
    currentUser = buildUser(null);

    await expect(
      useCase.execute('user-1', 'peu-importe', 'Nouveau1!'),
    ).rejects.toBeInstanceOf(BusinessRuleViolationException);
    expect(hashUpdates).toHaveLength(0);
  });
});
