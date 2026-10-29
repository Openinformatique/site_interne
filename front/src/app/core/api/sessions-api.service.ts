import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClient } from './api-client.service';
import { Session } from '../models/session.model';

@Injectable({ providedIn: 'root' })
export class SessionsApi {
  private api = inject(ApiClient);

  list(): Observable<Session[]> {
    return this.api.get<Session[]>('/auth/sessions');
  }
  revoke(id: string): Observable<void> {
    return this.api.delete<void>(`/auth/sessions/${id}`);
  }
  logoutAll(): Observable<{ revokedSessions: number }> {
    return this.api.post<{ revokedSessions: number }>('/auth/logout-all', {});
  }
}
