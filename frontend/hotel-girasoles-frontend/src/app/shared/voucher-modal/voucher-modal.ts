
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges
} from '@angular/core';

import { CommonModule } from '@angular/common';

import {
  PaymentMethod
} from '../../core/models/hotel.models';


export interface VoucherItem {

  name: string;

  quantity: number;

  unitPrice: number;

  subtotal: number;
}


export interface VoucherConsumptionGroup {

  paymentMethod: PaymentMethod;

  items: VoucherItem[];

  total: number;
}


export interface VoucherData {

  id?: number;

  roomNumber: string;

  guestName: string;

  guestDni?: string;

  items: VoucherItem[];

  subtotal: number;

  total: number;

  /*
   * Pago de la HABITACIÓN.
   *
   * NO representa el pago de los consumos.
   */
  paymentMethod?: PaymentMethod;

  paymentStatus: string;

  dateTime: string | Date;

  /*
   * Hora real en la que la reserva
   * fue finalizada.
   */
  finishedAt?: string | null;

  /*
   * Precio de la habitación.
   *
   * Si existe, el voucher corresponde
   * a una reserva.
   */
  roomPrice?: number;

  /*
   * Consumos agrupados por método
   * de pago.
   */
  consumptionGroups?: VoucherConsumptionGroup[];
}


@Component({
  selector: 'app-voucher-modal',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './voucher-modal.html',
  styleUrl: './voucher-modal.css'
})
export class VoucherModalComponent
  implements OnChanges {

  @Input()
  visible = false;

  @Input()
  voucher:
    VoucherData | null = null;

  @Output()
  closed =
    new EventEmitter<void>();

  @Output()
  payRequested =
    new EventEmitter<PaymentMethod>();

  selectedPayment:
    PaymentMethod | null = null;

  paying = false;

  /*
   * Si existe roomPrice estamos viendo
   * el comprobante completo de una reserva.
   *
   * Si no existe roomPrice es un
   * voucher normal de consumo.
   */
  get isReservationVoucher(): boolean {
    return this.voucher?.roomPrice !== undefined;
  }

  ngOnChanges(
    changes: SimpleChanges
  ): void {

    if (
      changes['voucher'] ||
      changes['visible']
    ) {

      this.paying = false;

      /*
       * Cuando el voucher tiene algo pendiente,
       * no seleccionamos automáticamente ningún
       * método. El usuario debe elegirlo.
       */
      if (
        this.voucher?.paymentStatus ===
        'PENDIENTE'
      ) {

        this.selectedPayment = null;

        return;
      }

      /*
       * Para un voucher pagado de reserva,
       * paymentMethod corresponde al pago
       * de la HABITACIÓN.
       */
      if (
        this.voucher?.paymentMethod ===
        'EFECTIVO'
      ) {

        this.selectedPayment =
          'EFECTIVO';

        return;
      }

      if (
        this.voucher?.paymentMethod ===
        'PLIN'
      ) {

        this.selectedPayment =
          'PLIN';

        return;
      }

      this.selectedPayment = null;
    }
  }

  close(): void {

    if (this.paying) {
      return;
    }

    this.closed.emit();
  }

  print(): void {
    window.print();
  }

  selectPayment(
    method: PaymentMethod
  ): void {

    if (this.paying) {
      return;
    }

    this.selectedPayment =
      method;

    /*
     * Cambio visual solamente.
     *
     * El pago real lo ejecuta rooms.ts.
     */
    if (this.voucher) {

      this.voucher = {

        ...this.voucher,

        paymentMethod:
          method

      };

    }
  }

  pay(): void {

    if (this.paying) {
      return;
    }

    if (
      !this.voucher ||
      this.voucher.paymentStatus !==
      'PENDIENTE'
    ) {

      return;
    }

    if (!this.selectedPayment) {
      return;
    }

    this.paying = true;

    this.payRequested.emit(
      this.selectedPayment
    );
  }

  resetPaymentState(): void {
    this.paying = false;
  }
}

