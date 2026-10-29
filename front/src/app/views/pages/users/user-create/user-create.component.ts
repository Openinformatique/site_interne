import { Component, DestroyRef, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { UsersApi } from '../../../../core/api/users-api.service';
import { TabsService } from '../../../../core/services/tabs.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { UserRole, USER_ROLE_LABELS } from '../../../../core/models/enums';
import { ApiError } from '../../../../core/models/api.model';

/** Miroir de IsStrongPassword du back : min 8, 1 maj, 1 min, 1 chiffre, 1 symbole. */
const STRONG_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

@Component({
  selector: 'app-user-create',
  imports: [ReactiveFormsModule],
  templateUrl: './user-create.component.html',
})
export class UserCreateComponent {
  private fb = inject(FormBuilder);
  private usersApi = inject(UsersApi);
  private tabsService = inject(TabsService);
  private toast = inject(ToastService);
  private router = inject(Router);

  readonly roles = [UserRole.Admin, UserRole.Manager, UserRole.Employee];
  readonly labels = USER_ROLE_LABELS;
  readonly saving = signal(false);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.pattern(STRONG_PASSWORD)]],
    displayName: ['', [Validators.required, Validators.maxLength(200)]],
    role: [UserRole.Employee, [Validators.required]],
  });

  constructor() {
    inject(DestroyRef).onDestroy(this.tabsService.registerDirtyCheck(() => this.form.dirty));
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.usersApi.create(this.form.getRawValue()).subscribe({
      next: () => {
        this.toast.success('Utilisateur créé.');
        this.router.navigateByUrl('/users');
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.applyServerErrors(err);
      },
    });
  }

  cancel(): void {
    this.router.navigateByUrl('/users');
  }

  /** 409 e-mail pris → erreur inline ; VALIDATION_ERROR → mapping champ à champ. */
  private applyServerErrors(err: HttpErrorResponse): void {
    if (err.status === 409) {
      this.form.controls.email.setErrors({ taken: true });
      return;
    }
    const apiError = (err.error as { error?: ApiError } | undefined)?.error;
    if (apiError?.code === 'VALIDATION_ERROR' && apiError.details) {
      for (const detail of apiError.details) {
        this.form.get(detail.field)?.setErrors({ server: detail.message });
      }
    }
  }
}