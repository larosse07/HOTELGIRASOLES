
export type RoomStatus =
  | 'DISPONIBLE'
  | 'OCUPADA'
  | 'LIMPIEZA';

export type ReservationStatus =
  | 'ACTIVA'
  | 'FINALIZADA'
  | 'CANCELADA';

export type PaymentMethod =
  | 'EFECTIVO'
  | 'PLIN';

export type ConsumptionPaymentStatus =
  | 'PAGADO'
  | 'SIN_PAGAR';

export type CashMovementType =
  | 'RESERVA'
  | 'CONSUMO';


export interface Room {

  id: number;

  roomNumber: string;

  type: string;

  price: number;

  nightPrice: number;

  status: RoomStatus;

  description?: string;

}


export interface Reservation {

  id: number;

  guestDni: string;

  guestName: string;

  room: Room;

  checkIn: string;

  estimatedCheckOut: string;

  finishedAt?: string;

  durationHours: number;

  roomPrice: number;

  paymentMethod: PaymentMethod;

  status: ReservationStatus;

}


export interface Product {

  id: number;

  name: string;

  price: number;

  stock: number;

}


export interface ConsumptionItem {

  id?: number;

  product: Product;

  quantity: number;

  unitPrice: number;

  subtotal: number;

}


export interface Consumption {

  id: number;

  reservation: Reservation;

  paymentStatus: ConsumptionPaymentStatus;

  paymentMethod?: PaymentMethod;

  total: number;

  createdAt: string;

  items: ConsumptionItem[];

}


export interface CashMovement {

  id: number;

  movementType: CashMovementType;

  referenceId: number;

  amount: number;

  paymentMethod: PaymentMethod;

  description: string;

  createdAt: string;

}


export interface NewReservation {

  guestDni: string;

  guestName: string;

  room: {

    id: number;

  };

  checkIn: string;

  estimatedCheckOut: string;

  durationHours: number;

  roomPrice: number;

  paymentMethod: PaymentMethod;

}


export interface NewConsumptionItem {

  product: {

    id: number;

  };

  quantity: number;

  unitPrice: number;

  subtotal: number;

}


export interface NewConsumption {

  reservation: {

    id: number;

  };

  paymentStatus: ConsumptionPaymentStatus;

  paymentMethod?: PaymentMethod;

  total: number;

  items: NewConsumptionItem[];

}

