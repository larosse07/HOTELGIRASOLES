import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {

  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  showAdminLogin = false;

  username = '';
  password = '';

  loading = false;
  errorMessage = '';

  selectReception(): void {
    this.loading = true;
    this.errorMessage = '';

    this.authService.enterReception().subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/rooms']);
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'No se pudo ingresar como recepción.';
      }
    });
  }

  selectAdmin(): void {
    this.showAdminLogin = true;
    this.errorMessage = '';
  }

  backToSelection(): void {
    this.showAdminLogin = false;
    this.username = '';
    this.password = '';
    this.errorMessage = '';
  }

  loginAdmin(): void {

    if (!this.username.trim() || !this.password) {
      this.errorMessage = 'Ingresa usuario y contraseña.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.authService.login(
      this.username.trim(),
      this.password
    ).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/']);
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Usuario o contraseña incorrectos.';
      }
    });
  }
}
