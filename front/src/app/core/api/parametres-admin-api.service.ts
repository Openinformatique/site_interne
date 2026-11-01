import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { ApiClient } from './api-client.service';
import { ParametresApi } from './parametres-api.service';
import { Parametre, TableInput, TableParametres } from '../models/parametre-admin.model';

/**
 * Administration du paramétrage (écran Paramètres, rôles ADMIN et
 * DIRECTION). Chaque modification de paramètres vide le cache de lecture de
 * la table (ParametresApi) : les listes déroulantes voient la nouvelle valeur.
 */
@Injectable({ providedIn: 'root' })
export class ParametresAdminApi {
  private api = inject(ApiClient);
  private parametresApi = inject(ParametresApi);

  tables(): Observable<TableParametres[]> {
    return this.api.get<TableParametres[]>('/parametres/admin/tables');
  }

  createTable(code: string, input: TableInput): Observable<TableParametres> {
    return this.api.post<TableParametres>('/parametres/admin/tables', { code, ...input });
  }

  updateTable(code: string, input: TableInput): Observable<TableParametres> {
    return this.api.put<TableParametres>(`/parametres/admin/tables/${code}`, input).pipe(tap(() => this.parametresApi.invalidate(code)));
  }

  deleteTable(code: string): Observable<void> {
    return this.api.delete<void>(`/parametres/admin/tables/${code}`).pipe(tap(() => this.parametresApi.invalidate(code)));
  }

  parametres(code: string): Observable<Parametre[]> {
    return this.api.get<Parametre[]>(`/parametres/admin/tables/${code}/parametres`);
  }

  createParametre(code: string, parametre: Parametre): Observable<Parametre> {
    return this.api
      .post<Parametre>(`/parametres/admin/tables/${code}/parametres`, parametre)
      .pipe(tap(() => this.parametresApi.invalidate(code)));
  }

  updateParametre(code: string, parametre: Parametre): Observable<Parametre> {
    const { cle, ...body } = parametre;
    return this.api
      .put<Parametre>(`/parametres/admin/tables/${code}/parametres/${encodeURIComponent(cle)}`, body)
      .pipe(tap(() => this.parametresApi.invalidate(code)));
  }

  deleteParametre(code: string, cle: string): Observable<void> {
    return this.api
      .delete<void>(`/parametres/admin/tables/${code}/parametres/${encodeURIComponent(cle)}`)
      .pipe(tap(() => this.parametresApi.invalidate(code)));
  }
}
