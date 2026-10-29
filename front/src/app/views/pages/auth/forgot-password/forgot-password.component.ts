import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-forgot-password',
  imports: [RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss',
})
export class ForgotPasswordComponent {
  loading = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;

  private router = inject(Router);

  onResetPassword(e: Event): void {
    e.preventDefault();
    if (this.loading) return;

    this.loading = true;
    this.successMessage = null;
    this.errorMessage = null;

    // Replace with your real auth API, e.g. this.authService.requestPasswordReset(email).subscribe({...})
    this.requestResetDemo().then(
      () => {
        this.loading = false;
        this.successMessage = "If an account exists with that email, we've sent reset instructions.";
        // Optional: redirect to login after delay
        // setTimeout(() => this.router.navigate(['/auth/login']), 3000);
      },
      (err) => {
        this.loading = false;
        this.errorMessage = err?.message ?? 'Failed to send reset email. Please try again.';
      }
    );
  }

  onBackToLogin(e: Event): void {
    e.preventDefault();
    this.router.navigate(['/auth/login']);
  }

  /** Demo only. Replace with AuthService.requestPasswordReset() that returns Observable or Promise. */
  private requestResetDemo(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 500));
  }
}