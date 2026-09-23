import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Reservation,
  ReservationStatus,
  NewReservation
} from '../models/hotel.models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ReservationService {

  private readonly http = inject(HttpClient);

  private readonly apiUrl =
    `${environment.apiUrl}/api/reservations`;

  getAll(): Observable<Reservation[]> {
    return this.http.get<Reservation[]>(this.apiUrl);
  }

  getById(id: number): Observable<Reservation> {
    return this.http.get<Reservation>(
      `${this.apiUrl}/${id}`
    );
  }

  getByStatus(
    status: ReservationStatus
  ): Observable<Reservation[]> {
    return this.http.get<Reservation[]>(
      `${this.apiUrl}/status/${status}`
    );
  }

  search(query: string): Observable<Reservation[]> {
    const params = new HttpParams()
      .set('q', query);

    return this.http.get<Reservation[]>(
      `${this.apiUrl}/search`,
      { params }
    );
  }

  create(
    reservation: NewReservation
  ): Observable<Reservation> {
    return this.http.post<Reservation>(
      this.apiUrl,
      reservation
    );
  }

  finish(id: number): Observable<Reservation> {
    return this.http.patch<Reservation>(
      `${this.apiUrl}/${id}/finish`,
      {}
    );
  }

  cancel(id: number): Observable<Reservation> {
    return this.http.patch<Reservation>(
      `${this.apiUrl}/${id}/cancel`,
      {}
    );
  }
}