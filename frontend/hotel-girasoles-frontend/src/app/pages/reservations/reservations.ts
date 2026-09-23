
import {
  ChangeDetectorRef,
  Component,
  OnInit,
  inject
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import {
  Reservation,
  Product,
  ConsumptionPaymentStatus,
  PaymentMethod,
  NewConsumption,
  Room
} from '../../core/models/hotel.models';

import { ReservationService } from '../../core/services/reservation.service';
import { ProductService } from '../../core/services/product.service';
import { ConsumptionService } from '../../core/services/consumption.service';
import { RoomService } from '../../core/services/room.service';

import {
  VoucherModalComponent,
  VoucherData,
  VoucherItem,
  VoucherConsumptionGroup
} from '../../shared/voucher-modal/voucher-modal';

@Component({
  selector: 'app-reservations',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    VoucherModalComponent
  ],
  templateUrl: './reservations.html',
  styleUrl: './reservations.css'
})
export class ReservationsComponent implements OnInit {
  private readonly reservationService =
    inject(ReservationService);

  private readonly productService =
    inject(ProductService);

  private readonly consumptionService =
    inject(ConsumptionService);

  private readonly roomService =
    inject(RoomService);

  private readonly cdr =
    inject(ChangeDetectorRef);

  reservations: Reservation[] = [];
  products: Product[] = [];
  rooms: Room[] = [];

  currentPage = 1;
  pageSize = 6;

  search = '';
  selectedStatus = '';
  selectedRoom = '';

  loading = false;
  error = '';
  success = '';

  consumptionTotals: Record<number, number> = {};
  consumptionExists: Record<number, boolean> = {};

  showAddProductModal = false;
  selectedReservationForProduct:
    Reservation | null = null;

  selectedProductId: number | null = null;
  productQuantity = 1;

  consumptionPaymentOption:
    'PAGADO_EFECTIVO' |
    'PAGADO_PLIN' |
    'SIN_PAGAR' =
    'PAGADO_EFECTIVO';

  savingProduct = false;

  showVoucherModal = false;
  activeVoucher: VoucherData | null = null;

  ngOnInit(): void {
    this.load();
    this.loadProducts();
    this.loadRooms();
  }

  load(): void {
    this.loading = true;
    this.error = '';

    this.reservationService.getAll().subscribe({
      next: reservations => {
        this.reservations = [...reservations].sort(
          (a, b) =>
            Number(b.id) - Number(a.id)
        );

        if (
          this.currentPage >
          this.totalPages
        ) {
          this.currentPage =
            this.totalPages;
        }

        this.loading = false;

        this.loadConsumptionTotals();

        this.cdr.detectChanges();
      },

      error: () => {
        this.loading = false;

        this.error =
          'No se pudieron cargar las reservas.';

        this.cdr.detectChanges();
      }
    });
  }

  loadRooms(): void {
    this.roomService.getAll().subscribe({
      next: rooms => {
        this.rooms = rooms;

        this.cdr.detectChanges();
      },

      error: () => {
        this.rooms = [];

        this.error =
          'No se pudieron cargar los estados actuales de las habitaciones.';

        this.cdr.detectChanges();
      }
    });
  }

  loadProducts(): void {
    this.productService.getAll().subscribe({
      next: products => {
        this.products = products;

        this.cdr.detectChanges();
      },

      error: () => {
        this.products = [];
      }
    });
  }

  loadConsumptionTotals(): void {
    this.consumptionTotals = {};
    this.consumptionExists = {};

    if (this.reservations.length === 0) {
      return;
    }

    let completed = 0;

    this.reservations.forEach(reservation => {
      this.consumptionService
        .getByReservation(
          Number(reservation.id)
        )
        .subscribe({
          next: consumptions => {
            const total =
              consumptions.reduce(
                (sum, consumption) =>
                  sum +
                  Number(
                    consumption.total ?? 0
                  ),
                0
              );

            this.consumptionTotals[
              Number(reservation.id)
            ] = total;

            this.consumptionExists[
              Number(reservation.id)
            ] =
              consumptions.length > 0;

            completed++;

            if (
              completed ===
              this.reservations.length
            ) {
              this.cdr.detectChanges();
            }
          },

          error: () => {
            this.consumptionTotals[
              Number(reservation.id)
            ] = 0;

            this.consumptionExists[
              Number(reservation.id)
            ] = false;

            completed++;

            if (
              completed ===
              this.reservations.length
            ) {
              this.cdr.detectChanges();
            }
          }
        });
    });
  }

  getReservationTotal(
    reservation: Reservation
  ): number {
    const roomPrice =
      Number(
        reservation.roomPrice ?? 0
      );

    const consumptionTotal =
      this.consumptionTotals[
      Number(reservation.id)
      ] ?? 0;

    return (
      roomPrice +
      consumptionTotal
    );
  }

  hasConsumption(
    reservation: Reservation
  ): boolean {
    return !!this.consumptionExists[
      Number(reservation.id)
    ];
  }

  get filteredReservations(): Reservation[] {
    const search =
      this.search
        .trim()
        .toLowerCase();

    return this.reservations.filter(
      reservation => {
        if (
          reservation.status ===
          'CANCELADA'
        ) {
          return false;
        }

        const matchesSearch =
          !search ||
          String(reservation.id)
            .toLowerCase()
            .includes(search) ||
          String(
            reservation.guestName ?? ''
          )
            .toLowerCase()
            .includes(search) ||
          String(
            reservation.room
              ?.roomNumber ?? ''
          )
            .toLowerCase()
            .includes(search);

        const matchesStatus =
          !this.selectedStatus ||
          this.statusLabel(
            reservation
          ) === this.selectedStatus;

        const matchesRoom =
          !this.selectedRoom ||
          String(
            reservation.room
              ?.roomNumber
          ) ===
          String(
            this.selectedRoom
          );

        return (
          matchesSearch &&
          matchesStatus &&
          matchesRoom
        );
      }
    );
  }

  get paginatedReservations(): Reservation[] {
    const start =
      (this.currentPage - 1) *
      this.pageSize;

    return this.filteredReservations.slice(
      start,
      start + this.pageSize
    );
  }

  get totalPages(): number {
    return Math.max(
      1,
      Math.ceil(
        this.filteredReservations.length /
        this.pageSize
      )
    );
  }

  get paginationStart(): number {
    if (
      this.filteredReservations.length === 0
    ) {
      return 0;
    }

    return (
      (this.currentPage - 1) *
      this.pageSize
    ) + 1;
  }

  get paginationEnd(): number {
    return Math.min(
      this.currentPage * this.pageSize,
      this.filteredReservations.length
    );
  }

  get pages(): number[] {
    return Array.from(
      { length: this.totalPages },
      (_, index) => index + 1
    );
  }

  goToPage(page: number): void {
    if (
      page < 1 ||
      page > this.totalPages
    ) {
      return;
    }

    this.currentPage = page;
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  nextPage(): void {
    if (
      this.currentPage <
      this.totalPages
    ) {
      this.currentPage++;
    }
  }

  onSearchChange(): void {
    this.currentPage = 1;
  }

  onStatusChange(): void {
    this.currentPage = 1;
  }

  onRoomChange(): void {
    this.currentPage = 1;
  }

  getCurrentRoom(
    reservation: Reservation
  ): Room | null {
    const roomId =
      Number(
        reservation.room?.id
      );

    return (
      this.rooms.find(
        room =>
          Number(room.id) === roomId
      ) ?? null
    );
  }

  statusLabel(
    reservation: Reservation
  ): string {
    if (
      reservation.status ===
      'CANCELADA'
    ) {
      return '';
    }

    if (
      reservation.status ===
      'FINALIZADA'
    ) {
      return 'RETIRADO';
    }

    const currentRoom =
      this.getCurrentRoom(
        reservation
      );

    if (!currentRoom) {
      return 'RETIRADO';
    }

    const roomId =
      Number(
        currentRoom.id
      );

    const activeForRoom =
      this.reservations
        .filter(item =>
          item.status === 'ACTIVA' &&
          Number(
            item.room?.id
          ) === roomId
        )
        .sort(
          (a, b) => {
            const dateA =
              new Date(
                a.checkIn
              ).getTime();

            const dateB =
              new Date(
                b.checkIn
              ).getTime();

            if (
              dateB !== dateA
            ) {
              return (
                dateB - dateA
              );
            }

            return (
              Number(b.id) -
              Number(a.id)
            );
          }
        );

    const latestActive =
      activeForRoom[0];

    if (
      reservation.status ===
      'ACTIVA' &&
      latestActive &&
      Number(
        latestActive.id
      ) ===
      Number(
        reservation.id
      ) &&
      currentRoom.status ===
      'OCUPADA'
    ) {
      return 'OCUPADO';
    }

    return 'RETIRADO';
  }

  openAddProductModal(
    reservation: Reservation
  ): void {
    this.selectedReservationForProduct =
      reservation;

    this.selectedProductId =
      this.products.length > 0
        ? Number(
          this.products[0].id
        )
        : null;

    this.productQuantity = 1;

    this.consumptionPaymentOption =
      'PAGADO_EFECTIVO';

    this.showAddProductModal = true;

    this.error = '';

    this.cdr.detectChanges();
  }

  closeAddProductModal(): void {
    this.showAddProductModal =
      false;

    this.selectedReservationForProduct =
      null;

    this.selectedProductId =
      null;

    this.productQuantity = 1;

    this.savingProduct = false;

    this.cdr.detectChanges();
  }

  get selectedProduct(): Product | null {
    if (
      this.selectedProductId ===
      null
    ) {
      return null;
    }

    return (
      this.products.find(
        product =>
          Number(
            product.id
          ) ===
          Number(
            this.selectedProductId
          )
      ) ?? null
    );
  }

  get consumptionSubtotal(): number {
    const product =
      this.selectedProduct;

    if (!product) {
      return 0;
    }

    return (
      Number(product.price) *
      Number(
        this.productQuantity || 0
      )
    );
  }

  saveProductConsumption(): void {
    if (
      !this.selectedReservationForProduct
    ) {
      return;
    }

    if (!this.selectedProduct) {
      this.error =
        'Selecciona un producto.';

      return;
    }

    if (
      this.productQuantity < 1
    ) {
      this.error =
        'La cantidad debe ser mayor a 0.';

      return;
    }

    if (
      this.productQuantity >
      Number(
        this.selectedProduct.stock
      )
    ) {
      this.error =
        'No hay suficiente stock.';

      return;
    }

    const reservation =
      this.selectedReservationForProduct;

    const paymentStatus:
      ConsumptionPaymentStatus =
      this.consumptionPaymentOption ===
        'SIN_PAGAR'
        ? 'SIN_PAGAR'
        : 'PAGADO';

    const paymentMethod:
      | PaymentMethod
      | undefined =
      this.consumptionPaymentOption ===
        'PAGADO_EFECTIVO'
        ? 'EFECTIVO'
        : this.consumptionPaymentOption ===
          'PAGADO_PLIN'
          ? 'PLIN'
          : undefined;

    const subtotal =
      this.consumptionSubtotal;

    const newConsumption:
      NewConsumption = {
      reservation: {
        id: Number(
          reservation.id
        )
      },

      paymentStatus,

      paymentMethod,

      total: subtotal,

      items: [
        {
          product: {
            id: Number(
              this.selectedProduct.id
            )
          },

          quantity:
            Number(
              this.productQuantity
            ),

          unitPrice:
            Number(
              this.selectedProduct
                .price
            ),

          subtotal
        }
      ]
    };

    this.savingProduct = true;
    this.error = '';
    this.success = '';

    this.consumptionService
      .create(newConsumption)
      .subscribe({
        next: () => {
          this.savingProduct =
            false;

          this.success =
            'Consumo registrado correctamente.';

          this.closeAddProductModal();

          this.loadConsumptionTotals();

          this.viewReservationVoucher(
            reservation
          );

          this.cdr.detectChanges();

          setTimeout(() => {
            this.success = '';

            this.cdr.detectChanges();
          }, 2500);
        },

        error: () => {
          this.savingProduct =
            false;

          this.error =
            'No se pudo registrar el consumo.';

          this.cdr.detectChanges();
        }
      });
  }

  viewReservationVoucher(
    reservation: Reservation
  ): void {
    this.error = '';
    this.activeVoucher = null;
    this.showVoucherModal = false;

    this.consumptionService
      .getByReservation(
        Number(
          reservation.id
        )
      )
      .subscribe({
        next: consumptions => {
          const allItems:
            VoucherItem[] = [];

          const consumptionGroupsMap =
            new Map<
              PaymentMethod,
              VoucherConsumptionGroup
            >();

          let consumptionGrandTotal = 0;
          let anyUnpaid = false;

          consumptions.forEach(
            consumption => {
              const consumptionTotal =
                Number(
                  consumption.total ?? 0
                );

              consumptionGrandTotal +=
                consumptionTotal;

              if (
                consumption.paymentStatus ===
                'SIN_PAGAR'
              ) {
                anyUnpaid = true;
              }

              const method =
                consumption.paymentMethod;

              consumption.items?.forEach(
                item => {
                  const quantity =
                    Number(
                      item.quantity ?? 0
                    );

                  const subtotal =
                    Number(
                      item.subtotal ?? 0
                    );

                  const unitPrice =
                    Number(
                      item.unitPrice ?? 0
                    );

                  const voucherItem:
                    VoucherItem = {
                    name:
                      item.product.name,

                    quantity,

                    unitPrice,

                    subtotal
                  };

                  allItems.push(
                    voucherItem
                  );

                  if (method) {
                    let group =
                      consumptionGroupsMap.get(
                        method
                      );

                    if (!group) {
                      group = {
                        paymentMethod:
                          method,

                        items: [],

                        total: 0
                      };

                      consumptionGroupsMap.set(
                        method,
                        group
                      );
                    }

                    group.items.push(
                      voucherItem
                    );

                    group.total +=
                      subtotal;
                  }
                }
              );
            }
          );

          const consumptionGroups =
            Array.from(
              consumptionGroupsMap.values()
            );

          const roomPrice =
            Number(
              reservation.roomPrice ?? 0
            );

          const grandTotal =
            roomPrice +
            consumptionGrandTotal;

          this.consumptionTotals[
            Number(
              reservation.id
            )
          ] = consumptionGrandTotal;

          this.consumptionExists[
            Number(
              reservation.id
            )
          ] =
            consumptions.length > 0;

          this.activeVoucher = {
            id: Number(
              reservation.id
            ),

            roomNumber:
              String(
                reservation.room
                  ?.roomNumber ?? ''
              ),

            guestName:
              reservation.guestName,

            guestDni:
              reservation.guestDni,

            items: allItems,

            subtotal:
              grandTotal,

            total:
              grandTotal,

            paymentMethod:
              reservation.paymentMethod,

            roomPrice,

            consumptionGroups,

            paymentStatus:
              anyUnpaid
                ? 'PENDIENTE'
                : 'PAGADO',

            dateTime:
              reservation.checkIn
          };

          this.showVoucherModal =
            true;

          this.cdr.detectChanges();
        },

        error: () => {
          this.error =
            'No se pudieron cargar los consumos de esta reserva.';

          this.cdr.detectChanges();
        }
      });
  }

  finish(
    reservation: Reservation
  ): void {
    if (!reservation.id) {
      return;
    }

    this.reservationService
      .finish(
        Number(
          reservation.id
        )
      )
      .subscribe({
        next: () => {
          this.success =
            'Reserva finalizada correctamente.';

          this.load();

          this.loadRooms();

          setTimeout(() => {
            this.success = '';

            this.cdr.detectChanges();
          }, 2500);
        },

        error: () => {
          this.error =
            'No se pudo finalizar la reserva.';

          this.cdr.detectChanges();
        }
      });
  }

  cancel(
    reservation: Reservation
  ): void {
    if (!reservation.id) {
      return;
    }

    this.reservationService
      .cancel(
        Number(
          reservation.id
        )
      )
      .subscribe({
        next: () => {
          this.success =
            'Reserva cancelada correctamente.';

          this.load();

          this.loadRooms();

          setTimeout(() => {
            this.success = '';

            this.cdr.detectChanges();
          }, 2500);
        },

        error: () => {
          this.error =
            'No se pudo cancelar la reserva.';

          this.cdr.detectChanges();
        }
      });
  }

  clearRoomFilter(): void {
    this.selectedRoom = '';
    this.currentPage = 1;

    this.cdr.detectChanges();
  }
}

