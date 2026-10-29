import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { SessionsApi } from '../../../../core/api/sessions-api.service';
import { AuthStore } from '../../../../core/auth/auth.store';
import { ConfirmService } from '../../../../shared/services/confirm.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { Session } from '../../../../core/models/session.model';

import { PageLoaderComponent } from '../../../../shared/components/page-loader/page-loader.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { DateFrPipe } from '../../../../shared/pipes/date-fr.pipe';

@Component({
  selector: 'app-sessions-page',
  imports: [PageLoaderComponent, EmptyStateComponent, DateFrPipe],
  templateUrl: './sessions-page.component.html',
})
export class SessionsPageComponent implements OnInit {
  private sessionsApi = inject(SessionsApi);
  private authStore = inject(AuthStore);
  private confirm = inject(ConfirmService);
  private toast = inject(ToastService);
  private router = inject(Router);

  readonly sessions = signal<Session[]>([]);
  readonly loading = signal(true);

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.sessionsApi.list().subscribe({
      next: (list) => {
        this.sessions.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  async revoke(session: Session): Promise<void> {
    if (session.isCurrent) return;
    const ok = await this.confirm.confirm('Révoquer la session', 'Cet appareil sera déconnecté.', {
      danger: true,
      confirmLabel: 'Révoquer',
    });
    if (!ok) return;
    this.sessionsApi.revoke(session.id).subscribe(() => {
      this.sessions.update((list) => list.filter((s) => s.id !== session.id));
      this.toast.success('Session révoquée.');
    });
  }

  async logoutAll(): Promise<void> {
    const ok = await this.confirm.confirm(
      'Déconnecter toutes mes sessions',
      'Tu seras déconnecté partout, y compris sur cet appareil.',
      { danger: true, confirmLabel: 'Tout déconnecter' },
    );
    if (!ok) return;
    this.sessionsApi.logoutAll().subscribe(() => {
      this.authStore.clearSession();
      void this.router.navigate(['/auth/login']);
    });
  }
}