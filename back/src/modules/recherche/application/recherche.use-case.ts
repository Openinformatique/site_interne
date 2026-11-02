import { Inject, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../common/interfaces/authenticated-user';
import { UserRole } from '../../users/domain/user-role.enum';
import {
  RECHERCHE,
  type RecherchePort,
  type ResultatRecherche,
} from '../domain/recherche.port';

/** Nombre maximal de mots pris en compte. */
export const TERMES_MAX = 8;
/** Longueur minimale de la recherche (caractères, espaces exclus). */
export const LONGUEUR_MIN = 2;
/** Résultats renvoyés au plus par catégorie. */
export const LIMITE_MAX = 200;

/**
 * Recherche globale : clients, commandes et pointages dont le texte contient
 * chacun des mots (casse et accents indifférents). Pointages : mêmes droits
 * que le planning (les siens ; ceux de tous pour Admin et Direction).
 */
@Injectable()
export class RechercheUseCase {
  constructor(@Inject(RECHERCHE) private readonly port: RecherchePort) {}

  async rechercher(
    user: AuthenticatedUser,
    q: string,
    limite: number,
  ): Promise<ResultatRecherche> {
    const termes = termesDe(q);
    const vide = { total: 0, items: [] };
    if (termes.length === 0) {
      return {
        termes,
        clients: vide,
        commandes: vide,
        pointages: { ...vide, heures: 0 },
      };
    }
    const nombre = Math.min(Math.max(Math.trunc(limite) || 1, 1), LIMITE_MAX);
    const [clients, commandes, pointages] = await Promise.all([
      this.port.clients(termes, nombre),
      this.port.commandes(termes, nombre),
      this.port.pointages(termes, voitTout(user) ? null : user.userId, nombre),
    ]);
    return { termes, clients, commandes, pointages };
  }
}

/** Mots de la recherche (8 au plus) ; aucun si la recherche est trop courte. */
export function termesDe(q: string): string[] {
  const termes = q.trim().split(/\s+/).filter(Boolean).slice(0, TERMES_MAX);
  return termes.join('').length >= LONGUEUR_MIN ? termes : [];
}

function voitTout(user: AuthenticatedUser): boolean {
  return user.role === UserRole.Admin || user.role === UserRole.Direction;
}
