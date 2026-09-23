import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  CashMovement
} from '../models/hotel.models';

@Injectable({
  providedIn: 'root'
})
export class CashService {

  private readonly http = inject(HttpClient);

  private readonly apiUrl =
    'https://hotelgirasoles-backend.onrender.com/api/cash';

  getAll(): Observable<CashMovement[]> {
    return this.http.get<CashMovement[]>(
      this.apiUrl
    );
  }

  getByDate(
    date: string
  ): Observable<CashMovement[]> {
    return this.http.get<CashMovement[]>(
      `${this.apiUrl}/date/${date}`
    );
  }

  getTotal(date: string): Observable<number> {
    return this.http.get<number>(
      `${this.apiUrl}/date/${date}/total`
    );
  }
}

