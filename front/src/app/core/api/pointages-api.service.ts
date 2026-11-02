import { Injectable, inject } from '@angular/core';
import { Observable, Subject, tap } from 'rxjs';

import { ApiClient } from './api-client.service';
import { ClientPointageOptions, JourIncomplet, Pointage, PointageInput, PointagesReference, ResultatImport } from '../models/pointage.model';

@Injectable({ providedIn: 'root' })
export class PointagesApi {
  private api = inject(ApiClient);
  private readonly changedSubject = new Subject<void>();

  /** Émet après chaque création, modification ou suppression de pointage (ex. cloche d'alertes). */
  readonly changed$ = this.changedSubject.asObservable();

  /** Jours ouvrés incomplets (moins de 7 h) de l'utilisateur connecté, sur 2 semaines. */
  alertes(): Observable<JourIncomplet[]> {
    return this.api.get<JourIncomplet[]>('/pointages/alertes');
  }

  /** Import Excel : contrôle du classeur et aperçu, sans rien créer. */
  verifierImport(utilisateurId: string, fichier: File): Observable<ResultatImport> {
    return this.api.postForm<ResultatImport>('/pointages/import/verification', formulaireImport(utilisateurId, fichier));
  }

  /** Import Excel : nouveau contrôle puis création (tout ou rien). */
  importer(utilisateurId: string, fichier: File): Observable<ResultatImport> {
    return this.api
      .postForm<ResultatImport>('/pointages/import', formulaireImport(utilisateurId, fichier))
      .pipe(tap((resultat) => resultat.importes > 0 && this.changedSubject.next()));
  }

  /** Types d'action, tags, personnes sélectionnables et clients actifs. */
  reference(): Observable<PointagesReference> {
    return this.api.get<PointagesReference>('/pointages/reference');
  }

  clientOptions(clientId: number): Observable<ClientPointageOptions> {
    return this.api.get<ClientPointageOptions>(`/pointages/clients/${clientId}/options`);
  }

  /** Pointages d'une personne qui chevauchent [du, au[. */
  list(utilisateurId: string, du: Date, au: Date): Observable<Pointage[]> {
    return this.api.get<Pointage[]>('/pointages', { utilisateurId, du: du.toISOString(), au: au.toISOString() });
  }

  create(input: PointageInput): Observable<Pointage> {
    return this.api.post<Pointage>('/pointages', input).pipe(tap(() => this.changedSubject.next()));
  }

  update(id: number, input: PointageInput): Observable<Pointage> {
    return this.api.put<Pointage>(`/pointages/${id}`, input).pipe(tap(() => this.changedSubject.next()));
  }

  delete(id: number): Observable<void> {
    return this.api.delete<void>(`/pointages/${id}`).pipe(tap(() => this.changedSubject.next()));
  }

  /** Édition PDF « Relevé mensuel » d'une personne (mois de 1 à 12). */
  releveMensuelPdf(utilisateurId: string, annee: number, mois: number, contenu: ContenuReleve): Observable<{ blob: Blob; filename: string }> {
    return this.api.download('/pointages/releve.pdf', { utilisateurId, annee, mois, contenu });
  }

  /** Relevé mensuel détaillé au format Excel (tableau filtrable). */
  releveMensuelExcel(utilisateurId: string, annee: number, mois: number): Observable<{ blob: Blob; filename: string }> {
    return this.api.download('/pointages/releve.xlsx', { utilisateurId, annee, mois });
  }

  /** « Export (format CFL) » : travaux réalisés pour un client sur une période (PDF). */
  exportCflPdf(criteres: ExportCflCriteres): Observable<{ blob: Blob; filename: string }> {
    return this.api.download('/pointages/export-cfl.pdf', {
      du: criteres.du,
      au: criteres.au,
      clientId: criteres.clientId,
      commandeId: criteres.commandeId ?? undefined,
      utilisateurId: criteres.utilisateurId ?? undefined,
      typeAction: criteres.typeAction ?? undefined,
      // Liste « a,b » (la virgule n'apparaît pas dans les tags du paramétrage).
      tags: criteres.tags.length ? criteres.tags.join(',') : undefined,
      sansTag: criteres.sansTag || undefined,
    });
  }
}

/** Critères de l'« Export (format CFL) » (dates « AAAA-MM-JJ », bornes incluses). */
export interface ExportCflCriteres {
  du: string;
  au: string;
  clientId: number;
  commandeId: number | null;
  utilisateurId: string | null;
  typeAction: string | null;
  tags: string[];
  sansTag: boolean;
}

/** Contenu du relevé mensuel : une ligne par description, ou par client et type d'action. */
export type ContenuReleve = 'detail' | 'synthese';

function formulaireImport(utilisateurId: string, fichier: File): FormData {
  const form = new FormData();
  form.append('file', fichier, fichier.name);
  form.append('utilisateurId', utilisateurId);
  return form;
}
