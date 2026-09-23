import { Component, OnInit, inject } from '@angular/core';

import { CommonModule } from '@angular/common';

import {
  RouterLink,
  RouterLinkActive,
  RouterOutlet
} from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet
  ],
  templateUrl: './shell.html',
  styleUrl: './shell.css'
})
export class ShellComponent implements OnInit {

  private readonly authService = inject(AuthService);

  currentDateStr = '';

  username = '';
  userRole = '';

  isAdmin = false;
  isReception = false;

  mobileMenuOpen = false;

  ngOnInit(): void {

    const now = new Date();

    this.currentDateStr = now.toLocaleDateString('es-PE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });

    this.username = this.authService.getUsername() ?? '';

    this.isAdmin = this.authService.isAdmin();
    this.isReception = this.authService.isReception();

    this.userRole = this.isAdmin
      ? 'Administrador'
      : 'Recepcionista';
  }

  get roomsRoute(): string {
    return this.isAdmin
      ? '/admin/rooms'
      : '/rooms';
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
  }

  logout(): void {

    this.authService.logout();

    window.location.href = '/login';
  }
}