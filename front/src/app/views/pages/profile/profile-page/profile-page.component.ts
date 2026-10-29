import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { UsersApi } from '../../../../core/api/users-api.service';
import { TabsService } from '../../../../core/services/tabs.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { User } from '../../../../core/models/user.model';
import { USER_ROLE_LABELS } from '../../../../core/models/enums';

const STRONG_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

@Component({
  selector: 'app-profile-page',
  imports: [ReactiveFormsModule],
  templateUrl: './profile-page.component.html',
})
export class ProfilePageComponent implements OnInit {
  private fb = inject(FormBuilder);
  private usersApi = inject(UsersApi);
  private tabsService = inject(TabsService);
  private toast = inject(ToastService);

  readonly me = signal<User | null>(null);
  readonly labels = USER_ROLE_LABELS;
  readonly saving = signal(false);

  readonly form = this.fb.nonNullable.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.pattern(STRONG_PASSWORD)]],
    confirm: ['', [Validators.required]],
  });

  constructor() {
    inject(DestroyRef).onDestroy(this.tabsService.registerDirtyCheck(() => this.form.dirty));
  }

  ngOnInit(): void {
    this.usersApi.me().subscribe((user) => this.me.set(user));
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const { currentPassword, newPassword, confirm } = this.form.getRawValue();
    if (newPassword !== confirm) {
      this.form.controls.confirm.setErrors({ mismatch: true });
      return;
    }
    this.saving.set(true);
    this.usersApi.changeMyPassword(currentPassword, newPassword).subscribe({
      next: () => {
        this.saving.set(false);
        this.form.reset();
        this.toast.success('Mot de passe changé. Pense à te reconnecter sur tes autres appareils.');
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        if (err.status === 409) {
          this.form.controls.currentPassword.setErrors({ wrong: true });
        }
      },
    });
  }
}