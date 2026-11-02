import { Inject, Injectable } from '@nestjs/common';
import {
  AccessDeniedException,
  ResourceNotFoundException,
  ValidationException,
} from '../../../common/exceptions/app-exceptions';
import type { AuthenticatedUser } from '../../../common/interfaces/authenticated-user';
import { jourMetier } from '../../../common/utils/sql-date.util';
import { UserRole } from '../../users/domain/user-role.enum';
import {
  JOURS_EXAMINES,
  joursIncomplets,
  type JourIncomplet,
} from '../domain/alertes-pointage';
import {
  POINTAGES,
  TYPES_COMMANDE,
  TYPES_CONTRAT,
  TYPES_SANS_CLIENT,
} from '../domain/pointage.port';
import type {
  ClientOption,
  CommandeOption,
  ContactOption,
  PersonneOption,
  Pointage,
  PointageInput,
  PointagePort,
  TypeAction,
} from '../domain/pointage.port';

export interface FieldError {
  field: string;
  message: string;
}

/** Période maximale d'une lecture du planning (une semaine affichée, avec marge). */
const MAX_JOURS_PERIODE = 42;
const HEURE_MS = 3_600_000;

/** Référentiels de l'écran : types d'action, tags, personnes et clients. */
export interface PointagesReference {
  types: TypeAction[];
  tags: string[];
  personnes: PersonneOption[];
  clients: ClientOption[];
}

/**
 * Cas d'utilisation de l'écran « Pointages » : planning d'une personne,
 * création, modification (y compris déplacement / redimensionnement) et
 * suppression d'un pointage.
 *
 * Droits : chacun saisit ses propres pointages ; les profils Admin et
 * Direction peuvent consulter et saisir ceux de toute personne.
 *
 * Règles de saisie : début et fin obligatoires (fin après début, 24 h au
 * plus) ; type d'action du paramétrage TYPA ; client obligatoire sauf
 * temps interne, congés, fériés et arrêts ; « Développement sur devis » :
 * commande hors contrat ; « Assistance sur contrat / téléphonique » :
 * commande sous contrat et contact ; commande et contact du client choisi.
 */
@Injectable()
export class PointagesUseCase {
  constructor(@Inject(POINTAGES) private readonly pointages: PointagePort) {}

  async reference(user: AuthenticatedUser): Promise<PointagesReference> {
    const [types, tags, personnes, clients] = await Promise.all([
      this.pointages.typesAction(),
      this.pointages.tags(),
      this.pointages.personnes(),
      this.pointages.clients(),
    ]);
    return {
      types,
      tags,
      // Sans droit étendu, la liste se limite à l'utilisateur connecté.
      personnes: canManageOthers(user)
        ? personnes
        : personnes.filter(
            (personne) =>
              personne.id.toLowerCase() === user.userId.toLowerCase(),
          ),
      clients,
    };
  }

  contacts(clientId: number): Promise<ContactOption[]> {
    return this.pointages.contacts(clientId);
  }

  commandes(clientId: number): Promise<CommandeOption[]> {
    return this.pointages.commandes(clientId);
  }

  async list(
    user: AuthenticatedUser,
    utilisateurId: string,
    du: Date,
    au: Date,
  ): Promise<Pointage[]> {
    assertAccess(user, utilisateurId);
    if (
      au <= du ||
      au.getTime() - du.getTime() > MAX_JOURS_PERIODE * 24 * HEURE_MS
    ) {
      throw new ValidationException([
        {
          field: 'au',
          message: `Période invalide (${MAX_JOURS_PERIODE} jours maximum).`,
        },
      ]);
    }
    return this.pointages.list(utilisateurId, du, au);
  }

  /**
   * Jours ouvrés incomplets (moins de 7 h) de l'utilisateur connecté sur les
   * 14 jours précédant aujourd'hui (règles dans domain/alertes-pointage.ts).
   */
  async alertes(
    user: AuthenticatedUser,
    aujourdhui = jourMetier(new Date()),
  ): Promise<JourIncomplet[]> {
    // Bornes larges d'un jour : le jour exact est situé à Paris ensuite.
    const debut = new Date(`${aujourdhui}T00:00:00Z`);
    debut.setUTCDate(debut.getUTCDate() - JOURS_EXAMINES - 1);
    const pointages = await this.pointages.list(
      user.userId,
      debut,
      new Date(`${aujourdhui}T00:00:00Z`),
    );
    return joursIncomplets(pointages, aujourdhui);
  }

  async create(
    user: AuthenticatedUser,
    input: PointageInput,
  ): Promise<Pointage> {
    assertAccess(user, input.utilisateurId);
    await this.assertValid(input);
    const id = await this.pointages.create(input, user.userId);
    return this.get(id);
  }

  async update(
    user: AuthenticatedUser,
    id: number,
    input: PointageInput,
  ): Promise<Pointage> {
    const current = await this.get(id);
    assertAccess(user, current.utilisateurId);
    assertAccess(user, input.utilisateurId);
    await this.assertValid(input);
    await this.pointages.update(id, input, user.userId);
    return this.get(id);
  }

  async delete(user: AuthenticatedUser, id: number): Promise<void> {
    const current = await this.get(id);
    assertAccess(user, current.utilisateurId);
    await this.pointages.delete(id);
  }

  private async get(id: number): Promise<Pointage> {
    const pointage = await this.pointages.find(id);
    if (!pointage) {
      throw new ResourceNotFoundException('Le pointage');
    }
    return pointage;
  }

  private async assertValid(input: PointageInput): Promise<void> {
    const errors = await this.erreursSaisie(input);
    if (errors.length > 0) {
      throw new ValidationException(errors);
    }
  }

  /**
   * Règles de saisie d'un pointage, par champ (saisie et import Excel :
   * application/import-pointages.use-case.ts).
   */
  async erreursSaisie(input: PointageInput): Promise<FieldError[]> {
    const errors: FieldError[] = [];
    const add = (field: string, message: string) =>
      errors.push({ field, message });
    const type = input.typeAction;

    const duree = input.fin.getTime() - input.debut.getTime();
    if (duree <= 0) {
      add('fin', "L'heure de fin doit suivre l'heure de début.");
    } else if (duree > 24 * HEURE_MS) {
      add('fin', 'Un pointage ne peut pas dépasser 24 heures.');
    }
    if (!(await this.pointages.userExists(input.utilisateurId))) {
      add('utilisateurId', 'Personne inconnue.');
    }
    if (!(await this.pointages.typeActionExists(type))) {
      add('typeAction', "Type d'action inconnu.");
    }

    if (input.clientId === null) {
      if (!TYPES_SANS_CLIENT.includes(type)) {
        add('clientId', 'Client obligatoire pour ce type de pointage.');
      }
      if (input.commandeId !== null) {
        add('commandeId', 'Une commande demande un client.');
      }
      if (input.contactId !== null) {
        add('contactId', 'Un contact demande un client.');
      }
    } else if (!(await this.pointages.clientExists(input.clientId))) {
      add('clientId', 'Client introuvable.');
    }

    const contrat = TYPES_CONTRAT.includes(type);
    if (input.commandeId === null) {
      if (contrat) {
        add('commandeId', 'Choisissez une commande de type contrat.');
      } else if (TYPES_COMMANDE.includes(type)) {
        add('commandeId', 'Choisissez une commande de type commande.');
      }
    } else if (input.clientId !== null) {
      const commande = await this.pointages.findCommande(input.commandeId);
      if (!commande || commande.clientId !== input.clientId) {
        add('commandeId', "Cette commande n'appartient pas au client.");
      } else if (contrat && !commande.contrat) {
        add('commandeId', 'Choisissez une commande de type contrat.');
      } else if (TYPES_COMMANDE.includes(type) && commande.contrat) {
        add('commandeId', 'Choisissez une commande de type commande.');
      }
    }

    if (input.contactId === null) {
      if (contrat) {
        add('contactId', 'Contact obligatoire pour une assistance.');
      }
    } else if (
      input.clientId !== null &&
      (await this.pointages.contactClient(input.contactId)) !== input.clientId
    ) {
      add('contactId', "Ce contact n'appartient pas au client.");
    }
    return errors;
  }
}

function canManageOthers(user: AuthenticatedUser): boolean {
  return user.role === UserRole.Admin || user.role === UserRole.Direction;
}

/** Les pointages d'une autre personne sont réservés aux profils Admin et Direction. */
export function assertAccess(
  user: AuthenticatedUser,
  utilisateurId: string | null,
): void {
  if (
    !canManageOthers(user) &&
    utilisateurId?.toLowerCase() !== user.userId.toLowerCase()
  ) {
    throw new AccessDeniedException();
  }
}
