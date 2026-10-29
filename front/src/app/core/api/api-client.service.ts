import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { ApiEnvelope, Page } from '../models/api.model';

/** Valeurs acceptées comme paramètres de requête. */
type ParamValue = string | number | boolean | null | undefined;
export type QueryParams = Record<string, ParamValue>;

/**
 * Wrapper typé de HttpClient qui déplie l'enveloppe { success, data, meta }.
 * Les services de feature (users-api, contacts-api…) s'appuieront dessus.
 */
@Injectable({ providedIn: 'root' })
export class ApiClient {
  private http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  /** GET simple → renvoie directement `data`. */
  get<T>(url: string, params?: QueryParams): Observable<T> {
    return this.http
      .get<ApiEnvelope<T>>(this.base + url, { params: this.toParams(params) })
      .pipe(map((env) => env.data));
  }

  /** GET paginé → renvoie { items, pagination }. */
  getPage<T>(url: string, params?: QueryParams): Observable<Page<T>> {
    return this.http
      .get<ApiEnvelope<T[]>>(this.base + url, { params: this.toParams(params) })
      .pipe(map((env) => ({ items: env.data, pagination: env.meta.pagination! })));
  }

  post<T>(url: string, body?: unknown): Observable<T> {
    return this.http.post<ApiEnvelope<T>>(this.base + url, body ?? {}).pipe(map((env) => env?.data));
  }

  patch<T>(url: string, body?: unknown): Observable<T> {
    return this.http.patch<ApiEnvelope<T>>(this.base + url, body ?? {}).pipe(map((env) => env?.data));
  }

  put<T>(url: string, body?: unknown): Observable<T> {
    return this.http.put<ApiEnvelope<T>>(this.base + url, body ?? {}).pipe(map((env) => env?.data));
  }

  /** DELETE → souvent 204 sans corps : `data` vaut alors undefined. */
  delete<T = void>(url: string): Observable<T> {
    return this.http.delete<ApiEnvelope<T>>(this.base + url).pipe(map((env) => env?.data as T));
  }

  /** POST multipart/form-data (upload de fichier) → déplie l'enveloppe. */
  postForm<T>(url: string, formData: FormData): Observable<T> {
    return this.http.post<ApiEnvelope<T>>(this.base + url, formData).pipe(map((env) => env.data));
  }

  /** POST renvoyant un binaire brut (ex. aperçu PDF), NON enveloppé. */
  postForBlob(url: string, body?: unknown): Observable<Blob> {
    return this.http.post(this.base + url, body ?? {}, { responseType: 'blob' });
  }

  /**
   * Téléchargement binaire (exports CSV/XLSX). Récupère le blob + le nom de
   * fichier depuis l'en-tête Content-Disposition.
   */
  download(url: string, params?: QueryParams): Observable<{ blob: Blob; filename: string }> {
    return this.http
      .get(this.base + url, {
        params: this.toParams(params),
        responseType: 'blob',
        observe: 'response',
      })
      .pipe(
        map((res) => ({
          blob: res.body as Blob,
          filename: this.filenameFrom(res.headers.get('content-disposition')),
        })),
      );
  }

  /** Construit les query params en IGNORANT les valeurs vides (undefined/null/''). */
  private toParams(params?: QueryParams): HttpParams {
    let httpParams = new HttpParams();
    if (!params) return httpParams;
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === '') continue;
      httpParams = httpParams.set(key, String(value));
    }
    return httpParams;
  }

  /** Extrait `nom.csv` de `attachment; filename="nom.csv"`. */
  private filenameFrom(contentDisposition: string | null): string {
    if (!contentDisposition) return 'export';
    const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(contentDisposition);
    return match ? decodeURIComponent(match[1]) : 'export';
  }
}
