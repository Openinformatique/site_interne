import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientContratEntity } from '../../clients/infrastructure/entities/client-contrat.entity';
import { ClientEntity } from '../../clients/infrastructure/entities/client.entity';
import {
  debutDuSuivi,
  pointageDansLeSuivi,
} from '../../clients/domain/contrat-suivi';
import { CommandeEntity } from '../../commandes/infrastructure/entities/commande.entity';
import { ParametreEntity } from '../../parametres/infrastructure/entities/parametre.entity';
import { PointageEntity } from '../../pointages/infrastructure/entities/pointage.entity';
import { UserEntity } from '../../users/infrastructure/entities/user.entity';
import {
  dateToUtcText,
  jourMetier,
  sqlDateToIso,
  sqlUtcText,
  utcTextToDate,
} from '../../../common/utils/sql-date.util';
import type {
  CommandeALivrerBrute,
  ContratCandidat,
  PointageAbsence,
  SuiviContrat,
  TableauDeBordPort,
} from '../domain/tableau-de-bord.port';

/** Heures par jour si le paramètre TDIV/HJOUR est absent ou invalide. */
const DEFAULT_HEURES_PAR_JOUR = 8;

/** Adaptateur TypeORM du port TableauDeBordPort. */
@Injectable()
export class TypeOrmTableauDeBordRepository implements TableauDeBordPort {
  constructor(
    @InjectRepository(ClientContratEntity)
    private readonly contrats: Repository<ClientContratEntity>,
    @InjectRepository(CommandeEntity)
    private readonly commandes: Repository<CommandeEntity>,
    @InjectRepository(PointageEntity)
    private readonly pointages: Repository<PointageEntity>,
    @InjectRepository(ParametreEntity)
    private readonly parametres: Repository<ParametreEntity>,
  ) {}

  async contratsCandidats(jour: string): Promise<ContratCandidat[]> {
    const rows = await this.contrats
      .createQueryBuilder('contrat')
      .innerJoin(ClientEntity, 'client', 'client.id = contrat.clientId')
      .select('contrat.id', 'contratId')
      .addSelect('contrat.libelleContrat', 'libelleContrat')
      .addSelect('contrat.dateEcheance', 'dateEcheance')
      .addSelect('client.id', 'clientId')
      .addSelect('client.codeClient', 'codeClient')
      .addSelect('client.raisonSociale', 'raisonSociale')
      .where('client.actif = 1')
      .andWhere(
        '(contrat.dateEcheance IS NULL OR contrat.dateEcheance >= :jour)',
        { jour },
      )
      .getRawMany<{
        contratId: number;
        libelleContrat: string | null;
        dateEcheance: Date | string | null;
        clientId: number;
        codeClient: string | null;
        raisonSociale: string | null;
      }>();
    return rows.map((row) => ({
      contratId: Number(row.contratId),
      libelleContrat: row.libelleContrat?.trim() || null,
      dateEcheance: sqlDateToIso(row.dateEcheance),
      clientId: Number(row.clientId),
      codeClient: row.codeClient?.trim() || null,
      raisonSociale: row.raisonSociale?.trim() || null,
    }));
  }

  async suivis(
    contratIds: readonly number[],
    heuresParJour: number,
  ): Promise<Map<number, SuiviContrat>> {
    const resultat = new Map<number, SuiviContrat>();
    if (contratIds.length === 0) {
      return resultat;
    }
    const ids = [...contratIds];
    // Mêmes règles que la liste des contrats de la fiche client
    // (clients/domain/contrat-suivi.ts) : crédit = jours commandés, débit =
    // pointages des commandes à partir de la première commande.
    const credits = await this.commandes
      .createQueryBuilder('commande')
      .select('commande.clientContratId', 'contratId')
      .addSelect('SUM(COALESCE(commande.nbJoursCommande, 0))', 'jours')
      .addSelect(
        'MIN(COALESCE(commande.dateCommande, commande.dateDevis))',
        'premiere',
      )
      .where('commande.clientContratId IN (:...ids)', { ids })
      .groupBy('commande.clientContratId')
      .getRawMany<{
        contratId: number;
        jours: string | number;
        premiere: Date | string | null;
      }>();
    const pointages = await this.pointages
      .createQueryBuilder('pointage')
      .innerJoin(
        CommandeEntity,
        'commande',
        'commande.id = pointage.commandeId AND commande.deletedAt IS NULL',
      )
      .select('commande.clientContratId', 'contratId')
      .addSelect(sqlUtcText('pointage.dateHeureDebut'), 'debut')
      .addSelect('pointage.tempsFacturable', 'heures')
      .where('commande.clientContratId IN (:...ids)', { ids })
      .getRawMany<{
        contratId: number;
        debut: string | null;
        heures: string | number | null;
      }>();

    const debutBy = new Map<number, string | null>();
    for (const credit of credits) {
      const contratId = Number(credit.contratId);
      debutBy.set(contratId, debutDuSuivi([sqlDateToIso(credit.premiere)]));
      resultat.set(contratId, {
        credit: Number(credit.jours) * heuresParJour,
        debit: 0,
      });
    }
    for (const pointage of pointages) {
      const contratId = Number(pointage.contratId);
      const suivi = resultat.get(contratId);
      const jour = pointage.debut
        ? jourMetier(utcTextToDate(pointage.debut))
        : null;
      if (suivi && pointageDansLeSuivi(jour, debutBy.get(contratId) ?? null)) {
        suivi.debit += Number(pointage.heures ?? 0);
      }
    }
    return resultat;
  }

  async commandesALivrer(jusquau: string): Promise<CommandeALivrerBrute[]> {
    const heures = this.pointages
      .createQueryBuilder('pointage')
      .select('COALESCE(SUM(pointage.tempsFacturable), 0)')
      .where('pointage.commandeId = commande.id');
    const rows = await this.commandes
      .createQueryBuilder('commande')
      .innerJoin(ClientEntity, 'client', 'client.id = commande.clientId')
      .select('commande.id', 'id')
      .addSelect('client.id', 'clientId')
      .addSelect('client.codeClient', 'codeClient')
      .addSelect('client.raisonSociale', 'raisonSociale')
      .addSelect('commande.libelleCommande', 'libelle')
      .addSelect('commande.numeroCommandeClient', 'numeroCommande')
      .addSelect('commande.numeroDevis', 'numeroDevis')
      .addSelect('commande.delai', 'delai')
      .addSelect('commande.nbJoursCommande', 'joursCommandes')
      .addSelect(`(${heures.getQuery()})`, 'heures')
      .where('commande.dateCloture IS NULL')
      .andWhere('commande.delai IS NOT NULL')
      .andWhere('commande.delai <= :jusquau', { jusquau })
      .orderBy('commande.delai', 'ASC')
      .addOrderBy('commande.id', 'ASC')
      .getRawMany<{
        id: number;
        clientId: number;
        codeClient: string | null;
        raisonSociale: string | null;
        libelle: string | null;
        numeroCommande: string | null;
        numeroDevis: string | null;
        delai: Date | string;
        joursCommandes: string | number | null;
        heures: string | number | null;
      }>();
    return rows.map((row) => ({
      id: Number(row.id),
      clientId: Number(row.clientId),
      codeClient: row.codeClient?.trim() || null,
      raisonSociale: row.raisonSociale?.trim() || null,
      libelle: row.libelle?.trim() || null,
      numeroCommande: row.numeroCommande?.trim() || null,
      numeroDevis: row.numeroDevis?.trim() || null,
      delai: sqlDateToIso(row.delai) as string,
      joursCommandes:
        row.joursCommandes === null ? null : Number(row.joursCommandes),
      heuresPointees: Number(row.heures ?? 0),
    }));
  }

  async absences(du: Date, au: Date): Promise<PointageAbsence[]> {
    const rows = await this.pointages
      .createQueryBuilder('pointage')
      .innerJoin(UserEntity, 'salarie', 'salarie.id = pointage.utilisateurId')
      .select('pointage.utilisateurId', 'utilisateurId')
      .addSelect('salarie.displayName', 'nom')
      .addSelect('pointage.typeAction', 'type')
      .addSelect(sqlUtcText('pointage.dateHeureDebut'), 'debut')
      .addSelect(sqlUtcText('pointage.dateHeureFin'), 'fin')
      .where("pointage.typeAction IN ('CP', 'FERIE')")
      .andWhere('pointage.dateHeureDebut >= CAST(:du AS datetime2)', {
        du: dateToUtcText(du),
      })
      .andWhere('pointage.dateHeureDebut < CAST(:au AS datetime2)', {
        au: dateToUtcText(au),
      })
      .andWhere('pointage.dateHeureFin IS NOT NULL')
      .getRawMany<{
        utilisateurId: string;
        nom: string;
        type: 'CP' | 'FERIE';
        debut: string;
        fin: string;
      }>();
    return rows.map((row) => ({
      utilisateurId: row.utilisateurId,
      nom: row.nom,
      type: row.type,
      debut: utcTextToDate(row.debut),
      fin: utcTextToDate(row.fin),
    }));
  }

  async heuresParJour(): Promise<number> {
    const parametre = await this.parametres.findOneBy({
      codeTable: 'TDIV',
      cleParametre: 'HJOUR',
      numRubrique: '02',
    });
    const value = Number(parametre?.zoneParametre?.replace(',', '.'));
    return Number.isFinite(value) && value > 0
      ? value
      : DEFAULT_HEURES_PAR_JOUR;
  }
}
