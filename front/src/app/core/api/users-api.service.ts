import { Injectable, inject } from '@angular/core';
import { Observable, Subject, tap } from 'rxjs';

import { ApiClient, QueryParams } from './api-client.service';
import { Page } from '../models/api.model';
import { User } from '../models/user.model';
import { UserRole } from '../models/enums';

export interface ListUsersQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDirection?: 'ASC' | 'DESC';
  search?: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface CreateUserDto {
  email: string;
  password: string;
  displayName: string;
  role?: UserRole;
}

@Injectable({ providedIn: 'root' })
export class UsersApi {
  private api = inject(ApiClient);
  private readonly createdSubject = new Subject<void>();

  /** Émet après chaque création d'utilisateur (ex. rafraîchir la liste, conservée dans son onglet). */
  readonly created$ = this.createdSubject.asObservable();

  list(query: ListUsersQuery): Observable<Page<User>> {
    return this.api.getPage<User>('/users', query as QueryParams);
  }
  getById(id: string): Observable<User> {
    return this.api.get<User>(`/users/${id}`);
  }
  create(dto: CreateUserDto): Observable<User> {
    return this.api.post<User>('/users', dto).pipe(tap(() => this.createdSubject.next()));
  }
  changeRole(id: string, role: UserRole): Observable<User> {
    return this.api.patch<User>(`/users/${id}/role`, { role });
  }
  deactivate(id: string): Observable<void> {
    return this.api.delete<void>(`/users/${id}`);
  }
  reactivate(id: string): Observable<User> {
    return this.api.patch<User>(`/users/${id}/reactivate`, {});
  }
  me(): Observable<User> {
    return this.api.get<User>('/auth/me');
  }
  changeMyPassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.api.patch<void>('/users/me/password', { currentPassword, newPassword });
  }
}