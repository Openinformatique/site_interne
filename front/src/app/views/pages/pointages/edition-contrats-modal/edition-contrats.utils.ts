import { ContratAssistance, EditionContratsCriteres } from '../../../../core/models/client.model';

/**
 * Contrat en cours à la date d'arrêté : mis en place au plus tard ce jour-là et
 * non échu (même règle que le back, clients/domain/contrat-suivi.ts).
 */
export function contratEnCours(contrat: ContratAssistance, jour: string): boolean {
  return (
    contrat.dateMiseEnPlace !== null &&
    contrat.dateMiseEnPlace <= jour &&
    (contrat.dateEcheance === null || contrat.dateEcheance >= jour)
  );
}

/** Contrats qui seront édités (un PDF chacun) : en cours et retenus par les filtres. */
export function contratsRetenus(contrats: readonly ContratAssistance[], criteres: EditionContratsCriteres): ContratAssistance[] {
  if (!criteres.arreteAu) {
    return [];
  }
  return contrats.filter(
    (contrat) =>
      contratEnCours(contrat, criteres.arreteAu) &&
      (criteres.groupe === null || contrat.groupe === criteres.groupe) &&
      (criteres.clientId === null || contrat.clientId === criteres.clientId) &&
      (criteres.contratId === null || contrat.id === criteres.contratId),
  );
}

/** Groupes ayant au moins un contrat, triés par libellé. */
export function groupesAvecContrat(contrats: readonly ContratAssistance[]): { cle: string; libelle: string }[] {
  const groupes = new Map<string, string>();
  for (const contrat of contrats) {
    if (contrat.groupe) {
      groupes.set(contrat.groupe, contrat.groupeLibelle || contrat.groupe);
    }
  }
  return [...groupes].map(([cle, libelle]) => ({ cle, libelle })).sort((a, b) => a.libelle.localeCompare(b.libelle, 'fr'));
}

/** Clients ayant un contrat (dans le groupe choisi), triés par nom. */
export function clientsAvecContrat(contrats: readonly ContratAssistance[], groupe: string | null): { id: number; nom: string }[] {
  const clients = new Map<number, string>();
  for (const contrat of contrats) {
    if (groupe === null || contrat.groupe === groupe) {
      clients.set(contrat.clientId, contrat.clientNom);
    }
  }
  return [...clients].map(([id, nom]) => ({ id, nom })).sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
}

/** Compteur : « 7 contrats seront édités (un PDF chacun), arrêtés au 31/10/2026. » */
export function libelleCompteur(nombre: number, arreteAu: string): string {
  if (!arreteAu) {
    return "Indiquez la date d'arrêté.";
  }
  const [annee, mois, jour] = arreteAu.split('-');
  const date = `${jour}/${mois}/${annee}`;
  if (nombre === 0) {
    return 'Aucun contrat ne correspond à ces critères.';
  }
  return nombre === 1
    ? `1 contrat sera édité, arrêté au ${date}.`
    : `${nombre} contrats seront édités (un PDF chacun), arrêtés au ${date}.`;
}
