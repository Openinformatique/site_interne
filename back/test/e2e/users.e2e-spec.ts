import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { UserRole } from '../../src/modules/users/domain/user-role.enum';
import {
  createE2eApplication,
  createE2eTestUser,
  E2eTestUser,
} from '../helpers/e2e-app';

/**
 * Scénario end-to-end de la gestion des utilisateurs : contrat du front
 * d'administration (profil, liste paginée, création, rôle, activation,
 * mot de passe) et application des rôles côté serveur.
 */
describe('Utilisateurs (e2e)', () => {
  let app: NestExpressApplication;
  let server: ReturnType<NestExpressApplication['getHttpServer']>;
  let admin: E2eTestUser;
  let employee: E2eTestUser;
  let adminToken: string;
  let employeeToken: string;
  const createdUserIds: string[] = [];

  const loginAs = async (user: E2eTestUser): Promise<string> => {
    const response = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: user.password })
      .expect(200);
    return response.body.data.accessToken as string;
  };

  beforeAll(async () => {
    app = await createE2eApplication();
    server = app.getHttpServer();
    admin = await createE2eTestUser(app, { role: UserRole.Admin });
    employee = await createE2eTestUser(app, { role: UserRole.Employee });
    adminToken = await loginAs(admin);
    employeeToken = await loginAs(employee);
  });

  afterAll(async () => {
    const dataSource = app.get(DataSource);
    for (const id of createdUserIds) {
      await dataSource.query('DELETE FROM auth_sessions WHERE user_id = @0', [
        id,
      ]);
      await dataSource.query('DELETE FROM users WHERE id = @0', [id]);
    }
    await employee.cleanup();
    await admin.cleanup();
    await app.close();
  });

  describe('GET /users/me et GET /auth/me', () => {
    it('users/me renvoie le profil complet, rôle compris', async () => {
      const response = await request(server)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toMatchObject({
        id: admin.id,
        email: admin.email,
        role: UserRole.Admin,
        isActive: true,
      });
      expect(response.body.data.createdAt).toBeDefined();
      expect(JSON.stringify(response.body)).not.toContain('passwordHash');
    });

    it('auth/me reste strictement { id, email, displayName }', async () => {
      const response = await request(server)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Object.keys(response.body.data as object).sort()).toEqual([
        'displayName',
        'email',
        'id',
      ]);
    });
  });

  describe('GET /users (liste paginée, ADMIN/MANAGER)', () => {
    it('renvoie la liste avec meta.pagination complet pour un ADMIN', async () => {
      const response = await request(server)
        .get(
          '/api/v1/users?page=1&limit=20&sortBy=createdAt&sortDirection=DESC',
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.meta.pagination).toMatchObject({
        page: 1,
        limit: 20,
      });
      expect(response.body.meta.pagination.totalItems).toBeGreaterThanOrEqual(
        2,
      );
      expect(response.body.meta.pagination).toHaveProperty('totalPages');
      expect(response.body.meta.pagination).toHaveProperty('hasNextPage');
      expect(response.body.meta.pagination).toHaveProperty('hasPreviousPage');
    });

    it('filtre par recherche et par statut actif', async () => {
      const response = await request(server)
        .get(`/api/v1/users?search=${admin.email}&isActive=true`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].email).toBe(admin.email);
    });

    it('refuse un EMPLOYEE avec 403 ACCESS_DENIED', async () => {
      const response = await request(server)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);

      expect(response.body.error.code).toBe('ACCESS_DENIED');
    });

    it('rejette une colonne de tri hors liste blanche', async () => {
      await request(server)
        .get('/api/v1/users?sortBy=passwordHash')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });

  describe('POST /users (ADMIN)', () => {
    it('crée un utilisateur avec le rôle par défaut EMPLOYEE', async () => {
      const email = `e2e-cree-${Date.now()}@test.dev`;
      const response = await request(server)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email, password: 'Nouveau1!', displayName: 'Créé en e2e' })
        .expect(201);

      createdUserIds.push(response.body.data.id as string);
      expect(response.body.data).toMatchObject({
        email,
        displayName: 'Créé en e2e',
        role: UserRole.Employee,
        isActive: true,
      });
    });

    it('refuse un e-mail déjà utilisé avec 409 RESOURCE_ALREADY_EXISTS', async () => {
      const response = await request(server)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: employee.email,
          password: 'Nouveau1!',
          displayName: 'Doublon',
        })
        .expect(409);

      expect(response.body.error.code).toBe('RESOURCE_ALREADY_EXISTS');
    });

    it('refuse un mot de passe faible avec le détail en français', async () => {
      const response = await request(server)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: `e2e-faible-${Date.now()}@test.dev`,
          password: 'faible',
          displayName: 'Mot de passe faible',
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'password' }),
        ]),
      );
    });

    it('refuse un EMPLOYEE avec 403', async () => {
      await request(server)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          email: 'refuse@test.dev',
          password: 'Nouveau1!',
          displayName: 'Refusé',
        })
        .expect(403);
    });
  });

  describe('PATCH /users/:id/role (ADMIN)', () => {
    it('change le rôle d’un autre utilisateur', async () => {
      const response = await request(server)
        .patch(`/api/v1/users/${employee.id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: UserRole.Manager })
        .expect(200);

      expect(response.body.data.role).toBe(UserRole.Manager);

      // Retour à l'état initial pour ne pas perturber les autres tests.
      await request(server)
        .patch(`/api/v1/users/${employee.id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: UserRole.Employee })
        .expect(200);
    });

    it('refuse la modification de son propre rôle (409)', async () => {
      const response = await request(server)
        .patch(`/api/v1/users/${admin.id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: UserRole.Employee })
        .expect(409);

      expect(response.body.error.code).toBe('BUSINESS_RULE_VIOLATION');
    });
  });

  describe('DELETE puis PATCH /users/:id/reactivate (ADMIN)', () => {
    it('désactive (204) puis réactive (200) : isActive bascule', async () => {
      await request(server)
        .delete(`/api/v1/users/${employee.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      const deactivated = await request(server)
        .get(`/api/v1/users/${employee.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(deactivated.body.data.isActive).toBe(false);

      const reactivated = await request(server)
        .patch(`/api/v1/users/${employee.id}/reactivate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(reactivated.body.data.isActive).toBe(true);
    });

    it('refuse la désactivation de son propre compte (409)', async () => {
      const response = await request(server)
        .delete(`/api/v1/users/${admin.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(409);

      expect(response.body.error.code).toBe('BUSINESS_RULE_VIOLATION');
    });

    it('renvoie 404 pour un utilisateur inconnu et 400 pour un id invalide', async () => {
      await request(server)
        .get('/api/v1/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      const invalid = await request(server)
        .get('/api/v1/users/pas-un-uuid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
      expect(invalid.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PATCH /users/me/password', () => {
    it('refuse un mot de passe actuel incorrect (409)', async () => {
      const response = await request(server)
        .patch('/api/v1/users/me/password')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ currentPassword: 'mauvais', newPassword: 'Nouveau1!' })
        .expect(409);

      expect(response.body.error.code).toBe('BUSINESS_RULE_VIOLATION');
    });

    it('change le mot de passe (204) et permet le login avec le nouveau', async () => {
      const newPassword = 'Nouveau-mdp-1!';
      await request(server)
        .patch('/api/v1/users/me/password')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ currentPassword: employee.password, newPassword })
        .expect(204);

      await request(server)
        .post('/api/v1/auth/login')
        .send({ email: employee.email, password: newPassword })
        .expect(200);

      // L'objet de test reste cohérent pour les suites éventuelles.
      employee.password = newPassword;
    });
  });
});
