import * as argon2 from 'argon2';
import dataSource from '../data-source';
import { UserEntity } from '../../modules/users/infrastructure/entities/user.entity';

/**
 * Réinitialise le mot de passe des utilisateurs semés par `npm run seed`.
 *
 * Le seeder ne modifie jamais le mot de passe d'un compte existant : si le
 * mot de passe généré au premier seed a été perdu, ce script réapplique
 * celui défini dans SEED_ADMIN_PASSWORD / SEED_USER_PASSWORD.
 *
 * Un compte dont la variable n'est pas renseignée est ignoré (aucun mot de
 * passe aléatoire n'est généré ici).
 *
 * Garde-fou : réservé aux environnements local et test.
 *
 * Usage : npm run seed:reset-passwords
 */

const SEEDED_ACCOUNTS = [
  { email: 'admin@local.dev', passwordEnvVariable: 'SEED_ADMIN_PASSWORD' },
  { email: 'user@local.dev', passwordEnvVariable: 'SEED_USER_PASSWORD' },
];

const ALLOWED_ENVIRONMENTS = ['local', 'test'];

async function resetSeedPasswords(): Promise<void> {
  // L'import de data-source a chargé le fichier .env.<NODE_ENV>.
  const nodeEnv = process.env.NODE_ENV ?? 'local';
  if (!ALLOWED_ENVIRONMENTS.includes(nodeEnv)) {
    throw new Error(
      `Refus de réinitialiser les mots de passe en environnement "${nodeEnv}".`,
    );
  }

  await dataSource.initialize();

  try {
    const userRepository = dataSource.getRepository(UserEntity);

    for (const account of SEEDED_ACCOUNTS) {
      const password = process.env[account.passwordEnvVariable];
      if (!password || password.trim() === '') {
        console.log(
          `ℹ ${account.passwordEnvVariable} non défini : ${account.email} ignoré.`,
        );
        continue;
      }

      const passwordHash = await argon2.hash(password, {
        type: argon2.argon2id,
      });
      const result = await userRepository.update(
        { email: account.email },
        { passwordHash },
      );

      if (result.affected) {
        console.log(`✔ Mot de passe de ${account.email} réinitialisé.`);
      } else {
        console.log(
          `ℹ ${account.email} introuvable : lancer d'abord npm run seed.`,
        );
      }
    }
  } finally {
    await dataSource.destroy();
  }
}

resetSeedPasswords()
  .then(() => {
    console.log('Réinitialisation des mots de passe terminée.');
  })
  .catch((error: unknown) => {
    console.error('Échec de la réinitialisation des mots de passe :', error);
    process.exit(1);
  });
