import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import {
  PaymentMethod,
  Room,
  NewReservation
} from '../../core/models/hotel.models';

import { RoomService } from '../../core/services/room.service';
import { ReservationService } from '../../core/services/reservation.service';

@Component({
  selector: 'app-reservation-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink
  ],
  templateUrl: './reservation-form.html',
  styleUrl: './reservation-form.css'
})
export class ReservationFormComponent implements OnInit {

  private readonly roomService = inject(RoomService);
  private readonly reservationService = inject(ReservationService);
  private readonly router = inject(Router);

  rooms: Room[] = [];

  guestDni = '';
  guestName = '';

  selectedRoomId: number | null = null;

  stayMode: 'HORAS' | 'NOCHE' = 'HORAS';

  durationHours = 4;

  paymentMethod: PaymentMethod = 'EFECTIVO';

  saving = false;
  errorMessage = '';

  ngOnInit(): void {
    this.loadRooms();
  }

  loadRooms(): void {
    this.roomService.getAll().subscribe({
      next: rooms => {
        this.rooms = rooms.filter(room =>
          room.status === 'DISPONIBLE' &&
          room.roomNumber !== '201A' &&
          room.roomNumber !== '301A'
        );

        this.updateSelectedRoom();
      },
      error: () => {
        this.errorMessage =
          'No se pudieron cargar las habitaciones.';
      }
    });
  }

  selectDuration(hours: number): void {
    this.stayMode = 'HORAS';
    this.durationHours = 4;

    this.updateSelectedRoom();
  }

  selectStayMode(mode: 'HORAS' | 'NOCHE'): void {
    this.stayMode = mode;

    if (mode === 'HORAS') {
      this.durationHours = 4;
    } else {
      this.durationHours = 24;
    }

    this.updateSelectedRoom();
  }

  selectPayment(method: PaymentMethod): void {
    this.paymentMethod = method;
  }

  get availableRooms(): Room[] {
    return this.rooms;
  }

  get selectedRoom(): Room | undefined {
    return this.rooms.find(
      room => Number(room.id) === Number(this.selectedRoomId)
    );
  }

  getRoomPrice(room: Room): number {
    const type = String(room.type ?? '').toLowerCase();

    const isJacuzzi = type.includes('jacuzzi');

    if (this.stayMode === 'NOCHE') {
      if (isJacuzzi) {
        return 0;
      }

      return 50;
    }

    if (isJacuzzi) {
      return 80;
    }

    return 40;
  }

  get total(): number {
    if (!this.selectedRoom) {
      return 0;
    }

    return this.getRoomPrice(this.selectedRoom);
  }

  get durationLabel(): string {
    return this.stayMode === 'NOCHE'
      ? 'Toda la noche'
      : '4 horas';
  }

  getRoomPriceLabel(room: Room): string {
    const type = String(room.type ?? '').toLowerCase();

    const isJacuzzi = type.includes('jacuzzi');

    if (this.stayMode === 'NOCHE' && isJacuzzi) {
      return 'No disponible';
    }

    const price = this.getRoomPrice(room);

    return `S/ ${price.toFixed(2)}`;
  }

  isRoomSelectable(room: Room): boolean {
    const type = String(room.type ?? '').toLowerCase();

    const isJacuzzi = type.includes('jacuzzi');

    if (this.stayMode === 'NOCHE' && isJacuzzi) {
      return false;
    }

    return true;
  }

  updateSelectedRoom(): void {
    const selected = this.selectedRoom;

    if (!selected) {
      return;
    }

    if (!this.isRoomSelectable(selected)) {
      this.selectedRoomId = null;
    }
  }

  /*
   * =========================================================
   * AÑADIR PRODUCTO
   *
   * NO crea la reserva.
   *
   * Solo lleva todos los datos de la reserva a Consumos.
   * La reserva se creará recién cuando se presione
   * "PAGAR TODO".
   * =========================================================
   */
  addProduct(): void {
    this.errorMessage = '';

    if (!this.guestDni.trim()) {
      this.errorMessage = 'Ingresa el DNI.';
      return;
    }

    if (!this.guestName.trim()) {
      this.errorMessage = 'Ingresa el nombre del huésped.';
      return;
    }

    if (!this.selectedRoomId) {
      this.errorMessage = 'Selecciona una habitación.';
      return;
    }

    if (!this.paymentMethod) {
      this.errorMessage = 'Selecciona un método de pago.';
      return;
    }

    const room = this.selectedRoom;

    if (!room) {
      this.errorMessage =
        'La habitación seleccionada ya no está disponible.';
      return;
    }

    if (!this.isRoomSelectable(room)) {
      this.errorMessage =
        'Esta habitación no está disponible para la modalidad seleccionada.';
      return;
    }

    this.router.navigate(
      ['/consumptions'],
      {
        queryParams: {
          initialConsumption: 'true',
          guestDni: this.guestDni.trim(),
          guestName: this.guestName.trim(),
          roomId: room.id,
          roomNumber: room.roomNumber,
          hours: this.stayMode === 'NOCHE' ? 24 : 4,
          roomPrice: this.total,
          paymentMethod: this.paymentMethod
        }
      }
    );
  }

  /*
   * =========================================================
   * CREAR RESERVA NORMAL
   * =========================================================
   */
  save(): void {
    this.errorMessage = '';

    if (!this.guestDni.trim()) {
      this.errorMessage = 'Ingresa el DNI.';
      return;
    }

    if (!this.guestName.trim()) {
      this.errorMessage = 'Ingresa el nombre del huésped.';
      return;
    }

    if (!this.selectedRoomId) {
      this.errorMessage = 'Selecciona una habitación.';
      return;
    }

    if (!this.paymentMethod) {
      this.errorMessage = 'Selecciona un método de pago.';
      return;
    }

    const room = this.selectedRoom;

    if (!room) {
      this.errorMessage =
        'La habitación seleccionada ya no está disponible.';
      return;
    }

    if (!this.isRoomSelectable(room)) {
      this.errorMessage =
        'Esta habitación no está disponible para la modalidad seleccionada.';
      return;
    }

    const checkIn = new Date();

    const reservationHours =
      this.stayMode === 'NOCHE'
        ? 24
        : 4;

    const estimatedCheckOut = new Date(
      checkIn.getTime() +
      reservationHours * 60 * 60 * 1000
    );

    const reservation: NewReservation = {
      guestDni: this.guestDni.trim(),
      guestName: this.guestName.trim(),
      room: {
        id: this.selectedRoomId
      },
      checkIn: this.toLocalDateTime(checkIn),
      estimatedCheckOut:
        this.toLocalDateTime(estimatedCheckOut),
      durationHours: reservationHours,
      roomPrice: this.total,
      paymentMethod: this.paymentMethod
    };

    this.saving = true;

    this.reservationService.create(reservation).subscribe({
      next: () => {
        this.router.navigate(['/reservations']);
      },
      error: () => {
        this.saving = false;
        this.errorMessage =
          'No se pudo registrar la reserva. Intenta nuevamente.';
      }
    });
  }

  private toLocalDateTime(date: Date): string {
    const pad = (value: number): string =>
      String(value).padStart(2, '0');

    return [
      date.getFullYear(),
      '-',
      pad(date.getMonth() + 1),
      '-',
      pad(date.getDate()),
      'T',
      pad(date.getHours()),
      ':',
      pad(date.getMinutes()),
      ':00'
    ].join('');
  }
}