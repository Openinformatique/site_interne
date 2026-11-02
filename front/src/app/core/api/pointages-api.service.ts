import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClient } from './api-client.service';
import { ClientPointageOptions, Pointage, PointageInput, PointagesReference } from '../models/pointage.model';

@Injectable({ providedIn: 'root' })
export class PointagesApi {
  private api = inject(ApiClient);

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
    return this.api.post<Pointage>('/pointages', input);
  }

  update(id: number, input: PointageInput): Observable<Pointage> {
    return this.api.put<Pointage>(`/pointages/${id}`, input);
  }

  delete(id: number): Observable<void> {
    return this.api.delete<void>(`/pointages/${id}`);
  }

  /** Édition PDF « Relevé mensuel » d'une personne (mois de 1 à 12). */
  releveMensuelPdf(utilisateurId: string, annee: number, mois: number, contenu: ContenuReleve): Observable<{ blob: Blob; filename: string }> {
    return this.api.download('/pointages/releve.pdf', { utilisateurId, annee, mois, contenu });
  }

  /** Relevé mensuel détaillé au format Excel (tableau filtrable). */
  releveMensuelExcel(utilisateurId: string, annee: number, mois: number): Observable<{ blob: Blob; filename: string }> {
    return this.api.download('/pointages/releve.xlsx', { utilisateurId, annee, mois });
  }
}

/** Contenu du relevé mensuel : une ligne par description, ou par client et type d'action. */
export type ContenuReleve = 'detail' | 'synthese';
