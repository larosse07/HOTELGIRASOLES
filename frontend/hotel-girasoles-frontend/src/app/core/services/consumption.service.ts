import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Consumption,
  NewConsumption,
  PaymentMethod
} from '../models/hotel.models';

@Injectable({
  providedIn: 'root'
})
export class ConsumptionService {

  private readonly http = inject(HttpClient);

  private readonly apiUrl =
    'https://hotelgirasoles-backend.onrender.com/api/consumptions';

  getAll(): Observable<Consumption[]> {
    return this.http.get<Consumption[]>(
      this.apiUrl
    );
  }

  getById(id: number): Observable<Consumption> {
    return this.http.get<Consumption>(
      `${this.apiUrl}/${id}`
    );
  }

  getByReservation(
    reservationId: number
  ): Observable<Consumption[]> {
    return this.http.get<Consumption[]>(
      `${this.apiUrl}/reservation/${reservationId}`
    );
  }

  create(
    consumption: NewConsumption
  ): Observable<Consumption> {
    return this.http.post<Consumption>(
      this.apiUrl,
      consumption
    );
  }

  pay(
    id: number,
    paymentMethod: PaymentMethod
  ): Observable<Consumption> {

    const params = new HttpParams()
      .set('paymentMethod', paymentMethod);

    return this.http.patch<Consumption>(
      `${this.apiUrl}/${id}/pay`,
      null,
      { params }
    );
  }
}

