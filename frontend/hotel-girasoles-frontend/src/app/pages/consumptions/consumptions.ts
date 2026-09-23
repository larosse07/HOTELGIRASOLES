import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  OnInit,
  inject
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import {
  ConsumptionPaymentStatus,
  NewConsumption,
  NewReservation,
  PaymentMethod,
  Product,
  Reservation
} from '../../core/models/hotel.models';

import { ProductService } from '../../core/services/product.service';
import { ReservationService } from '../../core/services/reservation.service';
import { ConsumptionService } from '../../core/services/consumption.service';
import { RoomService } from '../../core/services/room.service';

import {
  VoucherModalComponent,
  VoucherData
} from '../../shared/voucher-modal/voucher-modal';

export interface OrderLine {
  product: Product;
  quantity: number;
}

interface InitialReservationData {
  guestDni: string;
  guestName: string;
  roomId: number;
  roomNumber: string;
  hours: number;
  roomPrice: number;
  paymentMethod: PaymentMethod;
}

@Component({
  selector: 'app-consumptions',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    VoucherModalComponent
  ],
  templateUrl: './consumptions.html',
  styleUrl: './consumptions.css'
})
export class ConsumptionsComponent implements OnInit {

  private readonly productService =
    inject(ProductService);

  private readonly reservationService =
    inject(ReservationService);

  private readonly consumptionService =
    inject(ConsumptionService);

  private readonly roomService =
    inject(RoomService);

  private readonly route =
    inject(ActivatedRoute);

  private readonly router =
    inject(Router);

  private readonly cdr =
    inject(ChangeDetectorRef);

  products: Product[] = [];

  activeReservations: Reservation[] = [];

  selectedReservationId: number | null = null;

  orderLines: OrderLine[] = [];

  cargoStatus: 'CARGO' | 'PAGADO' = 'CARGO';

  paymentMethod: PaymentMethod = 'EFECTIVO';

  savingConsumption = false;

  showVoucherModal = false;

  activeVoucher: VoucherData | null = null;

  error = '';

  success = '';

  showSelectProductModal = false;

  initialProductMode = false;

  initialReservation: InitialReservationData | null = null;


  // =========================================================
  // INICIO
  // =========================================================

  ngOnInit(): void {
    this.readInitialReservation();
    this.loadProducts();
  }


  // =========================================================
  // RESERVA INICIAL + PRODUCTOS
  // =========================================================

  readInitialReservation(): void {

    this.route.queryParams.subscribe(params => {

      const initial =
        params['initialConsumption'] === 'true';

      if (!initial) {

        this.initialProductMode = false;

        this.initialReservation = null;

        this.selectedReservationId = null;

        this.loadActiveReservations();

        this.cdr.detectChanges();

        return;
      }

      const roomId =
        Number(params['roomId']);

      const hours =
        Number(params['hours']);

      const roomPrice =
        Number(params['roomPrice']);

      if (
        !params['guestDni'] ||
        !params['guestName'] ||
        !roomId ||
        !params['roomNumber'] ||
        !hours ||
        !roomPrice
      ) {

        this.error =
          'No se pudieron recuperar los datos de la reserva.';

        this.initialProductMode = false;

        this.initialReservation = null;

        this.selectedReservationId = null;

        this.loadActiveReservations();

        this.cdr.detectChanges();

        return;
      }

      this.initialProductMode = true;

      this.initialReservation = {

        guestDni:
          String(params['guestDni']),

        guestName:
          String(params['guestName']),

        roomId,

        roomNumber:
          String(params['roomNumber']),

        hours,

        roomPrice,

        paymentMethod:
          params['paymentMethod'] === 'PLIN'
            ? 'PLIN'
            : 'EFECTIVO'
      };

      this.selectedReservationId = null;

      this.paymentMethod =
        this.initialReservation.paymentMethod;

      this.loadActiveReservations();

      this.cdr.detectChanges();
    });
  }


  // =========================================================
  // CANCELAR RESERVA INICIAL
  // =========================================================

  cancelInitialConsumption(): void {

    if (
      !this.initialProductMode ||
      !this.initialReservation
    ) {
      return;
    }

    if (this.savingConsumption) {
      return;
    }

    const data =
      this.initialReservation;

    this.router.navigate(
      ['/rooms'],
      {
        queryParams: {
          restoreReservation: 'true',
          guestDni: data.guestDni,
          guestName: data.guestName,
          roomId: data.roomId,
          roomNumber: data.roomNumber,
          hours: data.hours,
          roomPrice: data.roomPrice,
          paymentMethod: data.paymentMethod
        }
      }
    );
  }


  // =========================================================
  // PRODUCTOS
  // =========================================================

  loadProducts(): void {

    this.productService
      .getAll()
      .subscribe({

        next: products => {

          this.products = [...products];

          this.cdr.detectChanges();
        },

        error: error => {

          console.error(
            'Error cargando productos:',
            error
          );

          this.error =
            'No se pudieron cargar los productos del inventario.';

          this.cdr.detectChanges();
        }
      });
  }


  // =========================================================
  // RESERVAS ACTIVAS
  // =========================================================

  loadActiveReservations(): void {

    this.reservationService
      .getByStatus('ACTIVA')
      .subscribe({

        next: reservations => {

          this.roomService
            .getAll()
            .subscribe({

              next: rooms => {

                const roomStatusById =
                  new Map<number, string>(
                    rooms.map(room => [
                      Number(room.id),
                      room.status
                    ])
                  );

                this.activeReservations =
                  reservations.filter(
                    reservation =>
                      reservation.status === 'ACTIVA' &&
                      roomStatusById.get(
                        Number(reservation.room.id)
                      ) === 'OCUPADA'
                  );

                if (this.initialProductMode) {

                  this.selectedReservationId = null;

                } else {

                  const selectedStillExists =
                    this.selectedReservationId !== null &&
                    this.activeReservations.some(
                      reservation =>
                        reservation.id ===
                        this.selectedReservationId
                    );

                  if (!selectedStillExists) {

                    this.selectedReservationId = null;
                  }

                  if (
                    this.selectedReservationId === null &&
                    this.activeReservations.length > 0
                  ) {

                    this.selectedReservationId =
                      this.activeReservations[0].id;
                  }
                }

                this.cdr.detectChanges();
              },

              error: error => {

                console.error(
                  'Error cargando habitaciones reales:',
                  error
                );

                this.error =
                  'No se pudieron verificar los estados reales de las habitaciones.';

                this.cdr.detectChanges();
              }
            });
        },

        error: error => {

          console.error(
            'Error cargando reservas activas:',
            error
          );

          this.error =
            'No se pudieron cargar las habitaciones ocupadas.';

          this.cdr.detectChanges();
        }
      });
  }


  // =========================================================
  // CATEGORÍA
  // =========================================================

  getCategory(product: Product): string {

    const name =
      product.name.toLowerCase();

    if (
      name.includes('agua') ||
      name.includes('inka') ||
      name.includes('inca') ||
      name.includes('sporade') ||
      name.includes('pilsen') ||
      name.includes('corona') ||
      name.includes('tres cruces') ||
      name.includes('vino') ||
      name.includes('cuates')
    ) {
      return 'Bebidas';
    }

    if (
      name.includes('shampoo') ||
      name.includes('h&s')
    ) {
      return 'Aseo';
    }

    return 'Otros';
  }


  // =========================================================
  // RESERVA SELECCIONADA
  // =========================================================

  get selectedReservation():
    Reservation | undefined {

    return this.activeReservations.find(
      reservation =>
        reservation.id ===
        this.selectedReservationId
    );
  }


  // =========================================================
  // TOTAL CONSUMO
  // =========================================================

  get orderSubtotal(): number {

    return this.orderLines.reduce(
      (total, line) =>
        total +
        Number(line.product.price) *
        line.quantity,
      0
    );
  }


  // =========================================================
  // TOTAL RESERVA INICIAL
  // =========================================================

  get initialRoomPrice(): number {

    return this.initialReservation?.roomPrice ?? 0;
  }


  get initialGrandTotal(): number {

    return (
      this.initialRoomPrice +
      this.orderSubtotal
    );
  }


  get initialHoursLabel(): string {

    if (!this.initialReservation) {
      return '';
    }

    return this.initialReservation.hours === 24
      ? 'Toda la noche'
      : `${this.initialReservation.hours} horas`;
  }


  // =========================================================
  // AGREGAR PRODUCTO A CONSUMO DE HUÉSPED
  // =========================================================

  addToOrder(product: Product): void {

    if (product.stock <= 0) {

      this.error =
        'Este producto no tiene stock disponible.';

      this.cdr.detectChanges();

      return;
    }

    const existing =
      this.orderLines.find(
        line =>
          line.product.id ===
          product.id
      );

    if (existing) {

      if (
        existing.quantity >=
        product.stock
      ) {

        this.error =
          'No hay más stock disponible de este producto.';

        this.cdr.detectChanges();

        return;
      }

      existing.quantity++;

    } else {

      this.orderLines.push({

        product,

        quantity: 1
      });
    }

    this.error = '';

    this.showSelectProductModal = false;

    this.cdr.detectChanges();
  }


  increaseQuantity(index: number): void {

    const line =
      this.orderLines[index];

    if (!line) {
      return;
    }

    if (
      line.quantity >=
      line.product.stock
    ) {

      this.error =
        'No hay más stock disponible de este producto.';

      this.cdr.detectChanges();

      return;
    }

    line.quantity++;

    this.error = '';

    this.cdr.detectChanges();
  }


  decreaseQuantity(index: number): void {

    const line =
      this.orderLines[index];

    if (!line) {
      return;
    }

    if (line.quantity <= 1) {
      return;
    }

    line.quantity--;

    this.error = '';

    this.cdr.detectChanges();
  }


  removeOrderLine(index: number): void {

    this.orderLines.splice(
      index,
      1
    );

    this.cdr.detectChanges();
  }


  // =========================================================
  // PAGAR TODO
  // =========================================================

  payEverything(): void {

    if (
      !this.initialProductMode ||
      !this.initialReservation
    ) {
      return;
    }

    if (this.orderLines.length === 0) {

      this.error =
        'Agrega al menos un producto antes de pagar todo.';

      this.cdr.detectChanges();

      return;
    }

    if (this.savingConsumption) {
      return;
    }

    this.savingConsumption = true;

    this.error = '';

    const data =
      this.initialReservation;

    const newReservation:
      NewReservation = {

      guestDni:
        data.guestDni,

      guestName:
        data.guestName,

      room: {
        id: data.roomId
      },

      checkIn:
        this.toLocalDateTime(
          new Date()
        ),

      estimatedCheckOut:
        this.toLocalDateTime(
          new Date(
            Date.now() +
            data.hours *
            60 *
            60 *
            1000
          )
        ),

      durationHours:
        data.hours,

      roomPrice:
        data.roomPrice,

      paymentMethod:
        data.paymentMethod
    };

    this.reservationService
      .create(newReservation)
      .subscribe({

        next: reservation => {

          this.createInitialConsumption(
            reservation
          );
        },

        error: error => {

          console.error(
            'Error creando reserva:',
            error
          );

          this.error =
            'No se pudo crear la reserva.';

          this.savingConsumption = false;

          this.cdr.detectChanges();
        }
      });
  }


  // =========================================================
  // CREAR CONSUMO INICIAL
  // =========================================================

  private createInitialConsumption(
    reservation: Reservation
  ): void {

    if (!this.initialReservation) {

      this.savingConsumption = false;

      return;
    }

    const reservationData =
      this.initialReservation;

    const consumptionData:
      NewConsumption = {

      reservation: {
        id: reservation.id
      },

      paymentStatus:
        'PAGADO',

      paymentMethod:
        reservationData.paymentMethod,

      total:
        this.orderSubtotal,

      items:
        this.orderLines.map(line => ({

          product: {
            id: line.product.id
          },

          quantity:
            line.quantity,

          unitPrice:
            Number(
              line.product.price
            ),

          subtotal:
            Number(
              line.product.price
            ) *
            line.quantity
        }))
    };

    this.consumptionService
      .create(consumptionData)
      .subscribe({

        next: () => {

          this.roomService
            .updateStatus(
              reservationData.roomId,
              'OCUPADA'
            )
            .subscribe({

              next: () => {

                this.activeVoucher = {

                  roomNumber:
                    reservationData.roomNumber,

                  guestName:
                    reservationData.guestName,

                  guestDni:
                    reservationData.guestDni,

                  items:
                    this.orderLines.map(
                      line => ({

                        name:
                          line.product.name,

                        quantity:
                          line.quantity,

                        unitPrice:
                          Number(
                            line.product.price
                          ),

                        subtotal:
                          Number(
                            line.product.price
                          ) *
                          line.quantity
                      })
                    ),

                  subtotal:
                    this.orderSubtotal,

                  total:
                    this.initialGrandTotal,

                  paymentMethod:
                    reservationData.paymentMethod,

                  paymentStatus:
                    'PAGADO',

                  dateTime:
                    new Date()
                };

                this.showVoucherModal = true;

                this.success =
                  'Reserva y consumo registrados correctamente.';

                this.initialProductMode =
                  false;

                this.initialReservation =
                  null;

                this.orderLines = [];

                this.savingConsumption =
                  false;

                this.loadProducts();

                this.loadActiveReservations();

                this.cdr.detectChanges();
              },

              error: error => {

                console.error(
                  'Error actualizando habitación:',
                  error
                );

                this.error =
                  'La reserva fue creada, pero no se pudo actualizar el estado de la habitación.';

                this.savingConsumption =
                  false;

                this.cdr.detectChanges();
              }
            });
        },

        error: error => {

          console.error(
            'Error creando consumo:',
            error
          );

          this.error =
            'La reserva fue creada, pero no se pudo registrar el consumo.';

          this.savingConsumption =
            false;

          this.cdr.detectChanges();
        }
      });
  }


  // =========================================================
  // REGISTRAR CONSUMO DE HUÉSPED
  // =========================================================

  registerConsumption(): void {

    if (!this.selectedReservation) {

      this.error =
        'Selecciona una habitación con estadía activa.';

      this.cdr.detectChanges();

      return;
    }

    if (this.orderLines.length === 0) {

      this.error =
        'Agrega al menos un producto.';

      this.cdr.detectChanges();

      return;
    }

    if (this.savingConsumption) {
      return;
    }

    this.savingConsumption = true;

    this.error = '';

    const reservation =
      this.selectedReservation;

    const paymentStatus:
      ConsumptionPaymentStatus =
      this.cargoStatus === 'PAGADO'
        ? 'PAGADO'
        : 'SIN_PAGAR';

    const consumptionData:
      NewConsumption = {

      reservation: {
        id: reservation.id
      },

      paymentStatus,

      paymentMethod:
        paymentStatus === 'PAGADO'
          ? this.paymentMethod
          : undefined,

      total:
        this.orderSubtotal,

      items:
        this.orderLines.map(line => ({

          product: {
            id: line.product.id
          },

          quantity:
            line.quantity,

          unitPrice:
            Number(
              line.product.price
            ),

          subtotal:
            Number(
              line.product.price
            ) *
            line.quantity
        }))
    };

    this.consumptionService
      .create(consumptionData)
      .subscribe({

        next: () => {

          if (
            paymentStatus ===
            'SIN_PAGAR'
          ) {

            this.success =
              'Consumo agregado a cuenta.';

            this.orderLines = [];

            this.cargoStatus = 'CARGO';

            this.savingConsumption =
              false;

            this.loadProducts();

            this.loadActiveReservations();

            this.cdr.detectChanges();

            return;
          }

          this.roomService
            .updateStatus(
              reservation.room.id,
              'OCUPADA'
            )
            .subscribe({

              next: () => {

                this.activeVoucher = {

                  roomNumber:
                    reservation.room.roomNumber,

                  guestName:
                    reservation.guestName,

                  guestDni:
                    reservation.guestDni,

                  items:
                    this.orderLines.map(
                      line => ({

                        name:
                          line.product.name,

                        quantity:
                          line.quantity,

                        unitPrice:
                          Number(
                            line.product.price
                          ),

                        subtotal:
                          Number(
                            line.product.price
                          ) *
                          line.quantity
                      })
                    ),

                  subtotal:
                    this.orderSubtotal,

                  total:
                    this.orderSubtotal,

                  paymentMethod:
                    this.paymentMethod,

                  paymentStatus:
                    'PAGADO',

                  dateTime:
                    new Date()
                };

                this.showVoucherModal = true;

                this.success =
                  'Consumo registrado y pagado correctamente.';

                this.orderLines = [];

                this.cargoStatus = 'CARGO';

                this.savingConsumption =
                  false;

                this.loadProducts();

                this.loadActiveReservations();

                this.cdr.detectChanges();
              },

              error: error => {

                console.error(
                  'Error actualizando habitación:',
                  error
                );

                this.error =
                  'El consumo fue registrado, pero no se pudo actualizar la habitación.';

                this.savingConsumption =
                  false;

                this.cdr.detectChanges();
              }
            });
        },

        error: error => {

          console.error(
            'Error registrando consumo:',
            error
          );

          this.error =
            'No se pudo registrar el consumo.';

          this.savingConsumption =
            false;

          this.cdr.detectChanges();
        }
      });
  }


  // =========================================================
  // REDONDEAR DINERO
  // =========================================================

  private roundMoney(
    value: number
  ): number {

    const numeric =
      Number(value);

    if (
      !Number.isFinite(
        numeric
      )
    ) {

      return 0;
    }

    return Math.round(
      (
        numeric +
        Number.EPSILON
      ) * 100
    ) / 100;
  }


  // =========================================================
  // FECHA LOCAL
  // =========================================================

  private toLocalDateTime(
    date: Date
  ): string {

    const year =
      date.getFullYear();

    const month =
      String(
        date.getMonth() + 1
      ).padStart(2, '0');

    const day =
      String(
        date.getDate()
      ).padStart(2, '0');

    const hours =
      String(
        date.getHours()
      ).padStart(2, '0');

    const minutes =
      String(
        date.getMinutes()
      ).padStart(2, '0');

    const seconds =
      String(
        date.getSeconds()
      ).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  }
}