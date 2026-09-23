import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Room,
  RoomStatus
} from '../models/hotel.models';

@Injectable({
  providedIn: 'root'
})
export class RoomService {

  private readonly http = inject(HttpClient);

  private readonly apiUrl =
    'http://localhost:8080/api/rooms';

  getAll(): Observable<Room[]> {
    return this.http.get<Room[]>(this.apiUrl);
  }

  getById(id: number): Observable<Room> {
    return this.http.get<Room>(`${this.apiUrl}/${id}`);
  }

  getByStatus(status: RoomStatus): Observable<Room[]> {
    return this.http.get<Room[]>(
      `${this.apiUrl}/status/${status}`
    );
  }

  create(room: Omit<Room, 'id'>): Observable<Room> {
    return this.http.post<Room>(
      this.apiUrl,
      room
    );
  }

  update(
    id: number,
    room: Omit<Room, 'id'>
  ): Observable<Room> {
    return this.http.put<Room>(
      `${this.apiUrl}/${id}`,
      room
    );
  }

  updateStatus(
    id: number,
    status: RoomStatus
  ): Observable<Room> {
    return this.http.patch<Room>(
      `${this.apiUrl}/${id}/status`,
      null,
      {
        params: { status }
      }
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/${id}`
    );
  }
}
