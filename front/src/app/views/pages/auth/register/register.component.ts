import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-register',
  imports: [RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent {
  loading = false;
  errorMessage: string | null = null;

  private router = inject(Router);

  onRegister(e: Event): void {
    e.preventDefault();
    if (this.loading) return;

    this.loading = true;
    this.errorMessage = null;

    // Replace with your real auth API, e.g. this.authService.register(payload).subscribe({...})
    this.registerDemo().then(
      () => {
        localStorage.setItem('isLoggedin', 'true');
        this.router.navigate(['/']);
        // Do not set loading = false on success: navigation is async; component is destroyed on route change.
      },
      (err) => {
        this.loading = false;
        this.errorMessage = err?.message ?? 'Registration failed. Please try again.';
      }
    );
  }

  /** Demo only. Replace with AuthService.register() that returns Observable or Promise. */
  private registerDemo(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 500));
  }
}
