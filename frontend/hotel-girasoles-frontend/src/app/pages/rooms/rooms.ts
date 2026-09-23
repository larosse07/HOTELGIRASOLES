import {
  Component,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import {
  Room,
  RoomStatus,
  Reservation,
  PaymentMethod
} from '../../core/models/hotel.models';

import {
  RoomService
} from '../../core/services/room.service';

import {
  ReservationService
} from '../../core/services/reservation.service';

import {
  ConsumptionService
} from '../../core/services/consumption.service';

import {
  VoucherModalComponent,
  VoucherData,
  VoucherItem,
  VoucherConsumptionGroup
} from '../../shared/voucher-modal/voucher-modal';

type RoomFilter =
  | 'TODAS'
  | 'DISPONIBLE'
  | 'OCUPADA'
  | 'PENDIENTE'
  | 'LIMPIEZA'
  | 'PERSONAL';

@Component({
  selector: 'app-rooms',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    VoucherModalComponent
  ],
  templateUrl: './rooms.html',
  styleUrl: './rooms.css'
})
export class RoomsComponent implements OnInit {

  rooms: Room[] = [];

  reservations: Reservation[] = [];

  filter: RoomFilter = 'TODAS';

  activeVoucher: VoucherData | null = null;

  showVoucherModal = false;

  loading = false;

  error = '';

  success = '';

  dni = '';

  guestName = '';

  hours = 4;

  selectedRoomId: number | null = null;

  paymentMethod: PaymentMethod = 'EFECTIVO';

  paymentOpen = false;

  estimatedCheckOutLabel = '';

  private pendingReservationIds =
    new Set<number>();

  constructor(
    private roomService: RoomService,
    private reservationService: ReservationService,
    private consumptionService: ConsumptionService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {

    this.loadData();

    this.updateEstimatedCheckOut();

  }

  loadData(): void {

    this.loading = true;

    this.error = '';

    this.filter = 'TODAS';

    this.roomService
      .getAll()
      .subscribe({

        next: rooms => {

          this.rooms = [
            ...rooms
          ].sort(
            (a, b) =>
              this.getRoomSortNumber(a) -
              this.getRoomSortNumber(b)
          );

          this.cdr.detectChanges();

          this.reservationService
            .getAll()
            .subscribe({

              next: reservations => {

                this.reservations =
                  reservations;

                this.loading = false;

                this.cdr.detectChanges();

                this.refreshPendingReservations();

              },

              error: () => {

                this.loading = false;

                this.error =
                  'No se pudieron cargar las reservas.';

                this.cdr.detectChanges();

              }

            });

        },

        error: () => {

          this.loading = false;

          this.error =
            'No se pudieron cargar las habitaciones.';

          this.cdr.detectChanges();

        }

      });

  }

  private getRoomSortNumber(
    room: Room
  ): number {

    const number =
      parseInt(
        room.roomNumber.replace(
          /\D/g,
          ''
        ),
        10
      );

    if (
      Number.isNaN(number)
    ) {

      return Number.MAX_SAFE_INTEGER;

    }

    return number;

  }

  private refreshPendingReservations(): void {

    this.pendingReservationIds.clear();

    this.cdr.detectChanges();

    const activeReservations =
      this.reservations.filter(
        reservation =>
          reservation.status === 'ACTIVA'
      );

    for (
      const reservation
      of activeReservations
    ) {

      this.consumptionService
        .getByReservation(
          reservation.id
        )
        .subscribe({

          next: consumptions => {

            const hasPending =
              consumptions.some(
                consumption =>
                  consumption.paymentStatus ===
                  'SIN_PAGAR'
              );

            if (hasPending) {

              this.pendingReservationIds.add(
                reservation.id
              );

            }

            this.cdr.detectChanges();

          },

          error: () => {

            this.cdr.detectChanges();

          }

        });

    }

  }

  get filteredRooms(): Room[] {

    if (
      this.filter === 'PERSONAL'
    ) {

      return this.rooms.filter(
        room =>
          this.isInternalRoom(room)
      );

    }

    if (
      this.filter === 'TODAS'
    ) {

      return this.rooms.filter(
        room =>
          !this.isInternalRoom(room)
      );

    }

    return this.rooms.filter(
      room =>
        !this.isInternalRoom(room) &&
        this.getRoomDisplayStatus(room) ===
        this.filter
    );

  }

  setFilter(
    filter: RoomFilter
  ): void {

    this.filter = filter;

    this.cdr.detectChanges();

  }

  get availableRooms(): Room[] {

    return this.rooms.filter(
      room => {

        if (
          this.isInternalRoom(room)
        ) {

          return false;

        }

        return (
          this.getRoomDisplayStatus(room) ===
          'DISPONIBLE'
        );

      }
    );

  }

  getRoomDisplayStatus(
    room: Room
  ):
    | 'DISPONIBLE'
    | 'OCUPADA'
    | 'PENDIENTE'
    | 'LIMPIEZA'
    | 'PERSONAL' {

    if (
      this.isInternalRoom(room)
    ) {

      return 'PERSONAL';

    }

    if (
      room.status === 'LIMPIEZA'
    ) {

      return 'LIMPIEZA';

    }

    if (
      room.status === 'DISPONIBLE'
    ) {

      return 'DISPONIBLE';

    }

    if (
      room.status === 'OCUPADA'
    ) {

      const reservation =
        this.getActiveReservation(
          room.id
        );

      if (
        reservation &&
        this.hasUnpaidConsumption(
          reservation.id
        )
      ) {

        return 'PENDIENTE';

      }

      return 'OCUPADA';

    }

    return 'DISPONIBLE';

  }

  getActiveReservation(
    roomId: number
  ): Reservation | undefined {

    return this.reservations.find(
      reservation =>
        Number(
          reservation.room.id
        ) === Number(roomId) &&
        reservation.status === 'ACTIVA'
    );

  }

  hasUnpaidConsumption(
    reservationId: number
  ): boolean {

    return this.pendingReservationIds.has(
      reservationId
    );

  }

  isPending(
    room: Room
  ): boolean {

    if (
      room.status !== 'OCUPADA'
    ) {

      return false;

    }

    const reservation =
      this.getActiveReservation(
        room.id
      );

    if (!reservation) {

      return false;

    }

    return this.hasUnpaidConsumption(
      reservation.id
    );

  }

  isInternalRoom(
    room: Room
  ): boolean {

    return (
      room.roomNumber === '201A' ||
      room.roomNumber === '301A'
    );

  }

  calculatedRoomPrice(
    room: Room
  ): number {

    const isJacuzzi =
      room.roomNumber === '206' ||
      room.roomNumber === '306';

    if (isJacuzzi) {

      return 80;

    }

    if (
      Number(this.hours) === 24
    ) {

      return 50;

    }

    return 40;

  }

  getRoomDisplayPrice(
    room: Room
  ): number {

    if (
      room.status === 'OCUPADA'
    ) {

      const reservation =
        this.getActiveReservation(
          room.id
        );

      if (reservation) {

        return Number(
          reservation.roomPrice
        );

      }

    }

    return Number(
      room.price
    );

  }

  updateEstimatedCheckOut(): void {

    const now =
      new Date();

    const duration =
      Number(this.hours) === 24
        ? 24
        : 4;

    const checkout =
      new Date(
        now.getTime() +
        duration *
        60 *
        60 *
        1000
      );

    this.estimatedCheckOutLabel =
      `Salida estimada: ${this.formatDateTime(checkout)}`;

  }

  private formatDateTime(
    date: Date
  ): string {

    const day =
      String(
        date.getDate()
      ).padStart(2, '0');

    const month =
      String(
        date.getMonth() + 1
      ).padStart(2, '0');

    const year =
      date.getFullYear();

    let hours =
      date.getHours();

    const minutes =
      String(
        date.getMinutes()
      ).padStart(2, '0');

    const period =
      hours >= 12
        ? 'PM'
        : 'AM';

    hours =
      hours % 12 || 12;

    const formattedHours =
      String(
        hours
      ).padStart(2, '0');

    return `${day}/${month}/${year} ${formattedHours}:${minutes} ${period}`;

  }

  formatReservationTime(
    dateTime: string
  ): string {

    if (!dateTime) {

      return '';

    }

    const match =
      dateTime.match(
        /T(\d{2}):(\d{2})/
      );

    if (!match) {

      return '';

    }

    let hours =
      Number(
        match[1]
      );

    const minutes =
      match[2];

    const period =
      hours >= 12
        ? 'PM'
        : 'AM';

    hours =
      hours % 12 || 12;

    const formattedHours =
      String(
        hours
      ).padStart(2, '0');

    return `${formattedHours}:${minutes} ${period}`;

  }

  togglePayment(): void {

    this.paymentOpen =
      !this.paymentOpen;

  }

  selectPayment(
    method: PaymentMethod
  ): void {

    this.paymentMethod =
      method;

    this.paymentOpen = false;

  }

  canReserve(): boolean {

    return (

      this.dni.trim().length > 0 &&

      this.guestName.trim().length > 0 &&

      this.selectedRoomId !== null &&

      (
        Number(this.hours) === 4 ||
        Number(this.hours) === 24
      ) &&

      (
        this.paymentMethod === 'EFECTIVO' ||
        this.paymentMethod === 'PLIN'
      )

    );

  }

  onHoursChange(): void {

    this.updateEstimatedCheckOut();

  }

  quickSelectRoom(
    room: Room
  ): void {

    if (
      this.isInternalRoom(room)
    ) {

      return;

    }

    if (
      this.getRoomDisplayStatus(room) !==
      'DISPONIBLE'
    ) {

      return;

    }

    this.selectedRoomId =
      room.id;

    this.error = '';

    this.updateEstimatedCheckOut();

    window.scrollTo({

      top: 0,

      behavior: 'smooth'

    });

  }

  addInitialProduct(): void {

    if (
      !this.canReserve()
    ) {

      this.error =
        'Complete DNI, nombre, horas, habitación y forma de pago.';

      return;

    }

    const room =
      this.rooms.find(
        currentRoom =>
          currentRoom.id ===
          this.selectedRoomId
      );

    if (!room) {

      this.error =
        'No se encontró la habitación seleccionada.';

      return;

    }

    const roomPrice =
      this.calculatedRoomPrice(
        room
      );

    this.router.navigate(
      ['/products'],
      {
        queryParams: {

          initialConsumption:
            'true',

          guestDni:
            this.dni.trim(),

          guestName:
            this.guestName.trim(),

          roomId:
            room.id,

          roomNumber:
            room.roomNumber,

          hours:
            Number(this.hours),

          roomPrice:
            roomPrice,

          paymentMethod:
            this.paymentMethod

        }
      }
    );

  }

  reserve(): void {

    if (
      !this.canReserve()
    ) {

      this.error =
        'Complete todos los datos de la reserva.';

      return;

    }

    const room =
      this.rooms.find(
        currentRoom =>
          currentRoom.id ===
          this.selectedRoomId
      );

    if (!room) {

      this.error =
        'No se encontró la habitación seleccionada.';

      return;

    }

    this.loading = true;

    this.error = '';

    this.success = '';

    const checkIn =
      new Date();

    const duration =
      Number(this.hours) === 24
        ? 24
        : 4;

    const checkOut =
      new Date(
        checkIn.getTime() +
        duration *
        60 *
        60 *
        1000
      );

    const newReservation = {

      guestDni:
        this.dni.trim(),

      guestName:
        this.guestName.trim(),

      room: {
        id: room.id
      },

      checkIn:
        this.toLocalDateTime(checkIn),

      estimatedCheckOut:
        this.toLocalDateTime(checkOut),

      durationHours:
        duration,

      roomPrice:
        this.calculatedRoomPrice(
          room
        ),

      paymentMethod:
        this.paymentMethod

    };

    this.reservationService
      .create(
        newReservation
      )
      .subscribe({

        next: () => {

          this.success =
            `Reserva creada correctamente para la habitación ${room.roomNumber}.`;

          this.resetQuickReception();

          this.loadData();

        },

        error: () => {

          this.loading = false;

          this.error =
            'No se pudo crear la reserva.';

        }

      });

  }

  clearForm(): void {

    if (this.loading) {

      return;

    }

    this.dni = '';

    this.guestName = '';

    this.hours = 4;

    this.selectedRoomId = null;

    this.paymentMethod =
      'EFECTIVO';

    this.paymentOpen = false;

    this.estimatedCheckOutLabel = '';

    this.error = '';

    this.success = '';

  }

  private resetQuickReception(): void {

    this.dni = '';

    this.guestName = '';

    this.hours = 4;

    this.selectedRoomId = null;

    this.paymentMethod =
      'EFECTIVO';

    this.paymentOpen = false;

    this.estimatedCheckOutLabel = '';

  }

  private toLocalDateTime(
    date: Date
  ): string {

    const pad = (
      value: number
    ): string => {

      return String(
        value
      ).padStart(
        2,
        '0'
      );

    };

    return [
      date.getFullYear(),
      '-',
      pad(
        date.getMonth() + 1
      ),
      '-',
      pad(
        date.getDate()
      ),
      'T',
      pad(
        date.getHours()
      ),
      ':',
      pad(
        date.getMinutes()
      ),
      ':00'
    ].join('');

  }

  changeStatus(
    room: Room,
    status: RoomStatus
  ): void {

    this.error = '';

    this.success = '';

    if (
      status === 'LIMPIEZA'
    ) {

      const reservation =
        this.getActiveReservation(
          room.id
        );

      if (reservation) {

        this.loading = true;

        this.reservationService
          .finish(
            reservation.id
          )
          .subscribe({

            next: () => {

              this.loading = false;

              this.success =
                `Habitación ${room.roomNumber} pasó a limpieza correctamente.`;

              this.cdr.detectChanges();

              this.loadData();

            },

            error: () => {

              this.loading = false;

              this.error =
                'No se pudo finalizar la reserva y pasar la habitación a limpieza.';

              this.cdr.detectChanges();

            }

          });

        return;

      }

    }

    const roomService =
      this.roomService as any;

    if (
      typeof roomService.updateStatus ===
      'function'
    ) {

      roomService
        .updateStatus(
          room.id,
          status
        )
        .subscribe({

          next: () => {

            room.status =
              status;

            this.success =
              `Habitación ${room.roomNumber} actualizada correctamente.`;

            this.cdr.detectChanges();

            this.loadData();

          },

          error: () => {

            this.error =
              'No se pudo actualizar el estado de la habitación.';

            this.cdr.detectChanges();

          }

        });

      return;

    }

    if (
      typeof roomService.update ===
      'function'
    ) {

      roomService
        .update(
          room.id,
          {
            ...room,
            status
          }
        )
        .subscribe({

          next: () => {

            room.status =
              status;

            this.success =
              `Habitación ${room.roomNumber} actualizada correctamente.`;

            this.cdr.detectChanges();

            this.loadData();

          },

          error: () => {

            this.error =
              'No se pudo actualizar el estado de la habitación.';

            this.cdr.detectChanges();

          }

        });

      return;

    }

    this.error =
      'El servicio de habitaciones no tiene un método para actualizar el estado.';

  }

  viewReservationVoucher(
    reservation: Reservation
  ): void {

    this.error = '';

    this.consumptionService
      .getByReservation(
        reservation.id
      )
      .subscribe({

        next: consumptions => {

          const groups =
            new Map<
              PaymentMethod,
              VoucherConsumptionGroup
            >();

          let consumptionTotal = 0;

          for (
            const consumption
            of consumptions
          ) {

            if (
              consumption.paymentStatus !==
              'PAGADO'
            ) {

              continue;

            }

            const method =
              consumption.paymentMethod;

            if (
              method !== 'EFECTIVO' &&
              method !== 'PLIN'
            ) {

              continue;

            }

            let group =
              groups.get(method);

            if (!group) {

              group = {

                paymentMethod:
                  method,

                items: [],

                total: 0

              };

              groups.set(
                method,
                group
              );

            }

            for (
              const item
              of consumption.items
            ) {

              const voucherItem:
                VoucherItem = {

                name:
                  item.product.name,

                quantity:
                  Number(
                    item.quantity
                  ),

                unitPrice:
                  Number(
                    item.unitPrice
                  ),

                subtotal:
                  Number(
                    item.subtotal
                  )

              };

              group.items.push(
                voucherItem
              );

            }

            group.total +=
              Number(
                consumption.total
              );

            consumptionTotal +=
              Number(
                consumption.total
              );

          }

          const consumptionGroups =
            Array.from(
              groups.values()
            );

          const allItems =
            consumptionGroups.flatMap(
              group =>
                group.items
            );

          const roomPrice =
            Number(
              reservation.roomPrice
            );

          const grandTotal =
            roomPrice +
            consumptionTotal;

          this.activeVoucher = {

            id:
              reservation.id,

            roomNumber:
              reservation.room.roomNumber,

            guestName:
              reservation.guestName,

            guestDni:
              reservation.guestDni,

            roomPrice,

            items:
              allItems,

            consumptionGroups,

            subtotal:
              grandTotal,

            total:
              grandTotal,

            paymentMethod:
              reservation.paymentMethod,

            paymentStatus:
              'PAGADO',

            dateTime:
              reservation.checkIn,

            finishedAt:
              reservation.finishedAt

          };

          this.showVoucherModal =
            true;

        },

        error: () => {

          this.error =
            'No se pudieron cargar los consumos.';

        }

      });

  }

  viewPendingVoucher(
    room: Room
  ): void {

    this.error = '';

    const reservation =
      this.getActiveReservation(
        room.id
      );

    if (!reservation) {

      this.error =
        'No se encontró una reserva activa para esta habitación.';

      return;

    }

    this.consumptionService
      .getByReservation(
        reservation.id
      )
      .subscribe({

        next: consumptions => {

          const pendingItems:
            VoucherItem[] = [];

          let pendingTotal = 0;

          for (
            const consumption
            of consumptions
          ) {

            if (
              consumption.paymentStatus !==
              'SIN_PAGAR'
            ) {

              continue;

            }

            pendingTotal +=
              Number(
                consumption.total
              );

            for (
              const item
              of consumption.items
            ) {

              pendingItems.push({

                name:
                  item.product.name,

                quantity:
                  Number(
                    item.quantity
                  ),

                unitPrice:
                  Number(
                    item.unitPrice
                  ),

                subtotal:
                  Number(
                    item.subtotal
                  )

              });

            }

          }

          if (
            pendingItems.length === 0
          ) {

            this.pendingReservationIds.delete(
              reservation.id
            );

            this.error =
              'Esta habitación ya no tiene consumos pendientes.';

            this.loadData();

            return;

          }

          this.activeVoucher = {

            id:
              reservation.id,

            roomNumber:
              reservation.room.roomNumber,

            guestName:
              reservation.guestName,

            guestDni:
              reservation.guestDni,

            items:
              pendingItems,

            subtotal:
              pendingTotal,

            total:
              pendingTotal,

            paymentMethod:
              undefined,

            paymentStatus:
              'PENDIENTE',

            dateTime:
              reservation.checkIn,

            consumptionGroups:
              []

          };

          this.showVoucherModal =
            true;

        },

        error: () => {

          this.error =
            'No se pudo cargar el voucher pendiente.';

        }

      });

  }

  closeVoucher(): void {

    this.showVoucherModal = false;

    this.activeVoucher = null;

  }

  payPendingFromVoucher(
    method: PaymentMethod
  ): void {

    if (
      !this.activeVoucher?.id
    ) {

      return;

    }

    const reservationId =
      this.activeVoucher.id;

    this.consumptionService
      .getByReservation(
        reservationId
      )
      .subscribe({

        next: consumptions => {

          const pending =
            consumptions.filter(
              consumption =>
                consumption.paymentStatus ===
                'SIN_PAGAR'
            );

          if (
            !pending.length
          ) {

            this.finishPendingRetirement(
              reservationId
            );

            return;

          }

          let completed = 0;

          let hasError = false;

          for (
            const consumption
            of pending
          ) {

            this.consumptionService
              .pay(
                consumption.id,
                method
              )
              .subscribe({

                next: () => {

                  completed++;

                  if (
                    completed ===
                    pending.length &&
                    !hasError
                  ) {

                    this.pendingReservationIds.delete(
                      reservationId
                    );

                    this.finishPendingRetirement(
                      reservationId
                    );

                  }

                },

                error: () => {

                  hasError = true;

                  this.error =
                    'No se pudo completar el pago de uno de los consumos.';

                  this.cdr.detectChanges();

                }

              });

          }

        },

        error: () => {

          this.error =
            'No se pudieron consultar los consumos.';

          this.cdr.detectChanges();

        }

      });

  }

  finishPendingRetirement(
    reservationId: number
  ): void {

    this.reservationService
      .finish(
        reservationId
      )
      .subscribe({

        next: () => {

          this.pendingReservationIds.delete(
            reservationId
          );

          this.closeVoucher();

          this.success =
            'Pago realizado. La habitación pasó a limpieza.';

          this.loadData();

        },

        error: () => {

          this.error =
            'El pago se realizó, pero no se pudo finalizar la reserva.';

          this.cdr.detectChanges();

        }

      });

  }

  onVoucherPaymentReset(): void {
  }

}