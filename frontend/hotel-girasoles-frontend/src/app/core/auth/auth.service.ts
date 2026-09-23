
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';

interface LoginResponse {
  token: string;
  username: string;
  role: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private readonly http = inject(HttpClient);

  private readonly apiUrl =
    `${environment.apiUrl}/api/auth`;

  login(
    username: string,
    password: string
  ): Observable<LoginResponse> {

    return this.http.post<LoginResponse>(
      `${this.apiUrl}/login`,
      { username, password }
    ).pipe(
      tap(response => {

        localStorage.setItem(
          'hotel_token',
          response.token
        );

        localStorage.setItem(
          'hotel_username',
          response.username
        );

        localStorage.setItem(
          'hotel_role',
          response.role
        );
      })
    );
  }

  enterReception(): Observable<LoginResponse> {

    return this.http.post<LoginResponse>(
      `${this.apiUrl}/reception`,
      {}
    ).pipe(
      tap(response => {

        localStorage.setItem(
          'hotel_token',
          response.token
        );

        localStorage.setItem(
          'hotel_username',
          response.username
        );

        localStorage.setItem(
          'hotel_role',
          response.role
        );
      })
    );
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('hotel_token');
  }

  getRole(): string | null {
    return localStorage.getItem('hotel_role');
  }

  getUsername(): string | null {
    return localStorage.getItem('hotel_username');
  }

  isAdmin(): boolean {
    return this.getRole() === 'ADMIN';
  }

  isReception(): boolean {
    return this.getRole() === 'RECEPCION';
  }

  logout(): void {

    localStorage.removeItem(
      'hotel_token'
    );

    localStorage.removeItem(
      'hotel_username'
    );

    localStorage.removeItem(
      'hotel_role'
    );
  }
}
