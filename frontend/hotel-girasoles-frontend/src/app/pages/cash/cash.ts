
import {
  ChangeDetectorRef,
  Component,
  OnInit,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  catchError,
  forkJoin,
  map,
  Observable
} from 'rxjs';

import {
  CashMovement,
  Consumption,
  Reservation,
  PaymentMethod
} from '../../core/models/hotel.models';

import { CashService } from '../../core/services/cash.service';
import { ReservationService } from '../../core/services/reservation.service';
import { ConsumptionService } from '../../core/services/consumption.service';
import { AuthService } from '../../core/auth/auth.service';
import {
  CashShiftService,
  CashShift,
  CashExpense
} from '../../core/services/cash-shift.service';

type MovementFilter =
  | 'TODOS'
  | 'EFECTIVO'
  | 'PLIN'
  | 'CONSUMO_PERSONAL'
  | 'INGRESO'
  | 'EGRESO';

type TimeFilter =
  | 'HOY'
  | 'AYER'
  | 'ESTE_MES'
  | 'FECHA';

type CashBookRowType =
  | 'APERTURA'
  | 'RESERVA'
  | 'CONSUMO'
  | 'CONSUMO_PERSONAL'
  | 'EGRESO'
  | 'ENTREGA';

interface CashBookRow {
  id: string;
  createdAt: string;
  type: CashBookRowType;
  room: string;
  reference: string;
  description: string;
  cash: number;
  PLIN: number;
  balance: number;
  clickable: boolean;
  referenceId?: number;
  movement?: CashMovement;
  expense?: CashExpense;
  shift?: CashShift;
}

interface OperationDetail {
  type:
  | 'RESERVA'
  | 'CONSUMO';
  reservation?: Reservation;
  consumption?: Consumption;
  consumptions: Consumption[];
  totalRoom: number;
  totalConsumption: number;
  total: number;
  cashTotal: number;
  PLINTotal: number;
}

interface PersonalExpenseDetail {
  expense: CashExpense;
  affectsCash: boolean;
  stockQuantity: number;
  paymentLabel: string;
}

@Component({
  selector: 'app-cash',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './cash.html',
  styleUrl: './cash.css'
})
export class CashComponent implements OnInit {
  isAdmin = false;

  private readonly authService = inject(AuthService);



  private readonly cashService =
    inject(CashService);

  private readonly reservationService =
    inject(ReservationService);

  private readonly consumptionService =
    inject(ConsumptionService);

  private readonly shiftService =
    inject(CashShiftService);

  private readonly cdr =
    inject(ChangeDetectorRef);

  // =========================================================
  // FECHA Y FILTROS
  // =========================================================

  timeFilter: TimeFilter = 'HOY';

  movementFilter: MovementFilter =
    'TODOS';

  selectedDate =
    this.getLocalDate();

  todayDateDisplay = '';

  // =========================================================
  // DATOS BACKEND
  // =========================================================

  movements: CashMovement[] = [];

  reservations: Reservation[] = [];

  consumptions: Consumption[] = [];

  // =========================================================
  // DATOS LOCALES
  // =========================================================

  shifts: CashShift[] = [];

  expenses: CashExpense[] = [];

  // =========================================================
  // LIBRO
  // =========================================================

  bookRows: CashBookRow[] = [];

  filteredRows: CashBookRow[] = [];

  // =========================================================
  // TOTALES DE CAJA
  // =========================================================

  totalEfectivo = 0;

  totalPLIN = 0;

  totalGeneral = 0;

  totalExpenses = 0;

  cashCollected = 0;

  expectedCash = 0;

  initialBalance = 0;

  finalCash = 0;

  // =========================================================
  // GASTOS DE PERSONAL
  // =========================================================

  personalExpenses: CashExpense[] = [];

  personalHotelExpenses: CashExpense[] = [];

  personalWorkerExpenses: CashExpense[] = [];

  personalAccountExpenses: CashExpense[] = [];

  totalPersonalExpenses = 0;

  totalPersonalHotelExpenses = 0;

  totalPersonalWorkerExpenses = 0;

  totalPersonalAccountExpenses = 0;

  personalStockUnits = 0;

  // =========================================================
  // GASTOS NORMALES
  // =========================================================

  normalExpenses: CashExpense[] = [];

  totalNormalExpenses = 0;

  // =========================================================
  // TURNOS
  // =========================================================

  currentShift: CashShift | null = null;

  lastHandoffAmount = 0;

  openingPersonName = '';

  openingAmount = 0;

  countedAmount = 0;

  difference = 0;

  handoffPersonName = '';

  // =========================================================
  // MODALES
  // =========================================================

  showOpenShiftModal = false;

  showHandoffModal = false;

  showExpenseModal = false;

  showOperationModal = false;

  showPersonalExpenseModal = false;

  showCalendar = false;

  selectedOperation:
    OperationDetail | null = null;

  selectedPersonalExpense:
    PersonalExpenseDetail | null = null;

  // =========================================================
  // EGRESO NORMAL
  // =========================================================

  expenseAmount = 0;

  expenseDescription = '';

  // =========================================================
  // ESTADOS
  // =========================================================

  loading = false;

  errorMessage = '';

  successMessage = '';

  // =========================================================
  // LOCAL STORAGE
  // =========================================================

  private readonly CASH_FILTER_STORAGE_KEY =
    'hotelgr_cash_time_filter';

  private readonly CASH_DATE_STORAGE_KEY =
    'hotelgr_cash_selected_date';

  // =========================================================
  // INICIO
  // =========================================================

  ngOnInit(): void {

    this.isAdmin =
      this.authService.isAdmin();

    this.restoreCashViewState();
    this.todayDateDisplay =
      this.formatLongDate(
        this.selectedDate
      );

    if (
      this.timeFilter ===
      'ESTE_MES'
    ) {
      this.loadCurrentMonth();
      return;
    }

    this.load();
  }

  // =========================================================
  // FECHAS
  // =========================================================

  private getLocalDate(): string {

    const now =
      new Date();

    const year =
      now.getFullYear();

    const month =
      String(
        now.getMonth() + 1
      ).padStart(
        2,
        '0'
      );

    const day =
      String(
        now.getDate()
      ).padStart(
        2,
        '0'
      );

    return `${year}-${month}-${day}`;
  }

  private dateFromString(
    value: string
  ): Date {

    const [
      year,
      month,
      day
    ] =
      value
        .split('-')
        .map(Number);

    return new Date(
      year,
      month - 1,
      day
    );
  }

  formatLongDate(
    date: string
  ): string {

    const value =
      this.dateFromString(
        date
      );

    return value.toLocaleDateString(
      'es-PE',
      {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }
    );
  }

  formatDateTime(
    value?: string
  ): string {

    if (!value) {
      return '—';
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return value;
    }

    return date.toLocaleString(
      'es-PE',
      {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }
    );
  }

  formatTime(
    value?: string
  ): string {

    if (!value) {
      return '—';
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return value;
    }

    return date.toLocaleTimeString(
      'es-PE',
      {
        hour: '2-digit',
        minute: '2-digit'
      }
    );
  }

  // =========================================================
  // CAMBIO DE PERIODO
  // =========================================================

  setToday(): void {

    this.timeFilter =
      'HOY';

    this.selectedDate =
      this.getLocalDate();

    this.todayDateDisplay =
      this.formatLongDate(
        this.selectedDate
      );

    this.saveCashViewState();

    this.load();
  }

  setYesterday(): void {

    const date =
      new Date();

    date.setDate(
      date.getDate() - 1
    );

    this.selectedDate =
      this.toDateInput(
        date
      );

    this.timeFilter =
      'AYER';

    this.todayDateDisplay =
      this.formatLongDate(
        this.selectedDate
      );

    this.saveCashViewState();

    this.load();
  }

  setCurrentMonth(): void {

    this.timeFilter =
      'ESTE_MES';

    this.saveCashViewState();

    this.loadCurrentMonth();
  }

  onDateChange(): void {

    if (!this.selectedDate) {
      return;
    }

    this.timeFilter =
      'FECHA';

    this.todayDateDisplay =
      this.formatLongDate(
        this.selectedDate
      );

    this.showCalendar =
      false;

    this.saveCashViewState();

    this.load();
  }

  private toDateInput(
    date: Date
  ): string {

    const year =
      date.getFullYear();

    const month =
      String(
        date.getMonth() + 1
      ).padStart(
        2,
        '0'
      );

    const day =
      String(
        date.getDate()
      ).padStart(
        2,
        '0'
      );

    return `${year}-${month}-${day}`;
  }

  // =========================================================
  // CARGAR MOVIMIENTOS DE CAJA
  // =========================================================

  private loadMovementsForDate(
    date: string
  ): Observable<CashMovement[]> {

    return this.cashService
      .getByDate(date)
      .pipe(
        catchError(
          () => {

            return this.cashService
              .getAll()
              .pipe(
                map(
                  movements =>
                    movements.filter(
                      movement =>
                        this.getDateFromIso(
                          movement.createdAt
                        ) === date
                    )
                ),
                catchError(
                  () => {

                    throw new Error(
                      'No se pudieron cargar los movimientos de Caja.'
                    );

                  }
                )
              );

          }
        )
      );
  }

  // =========================================================
  // CARGA PRINCIPAL
  // =========================================================

  load(): void {

    this.loading = true;

    this.errorMessage = '';

    this.successMessage = '';

    forkJoin({

      movements:
        this.loadMovementsForDate(
          this.selectedDate
        ),

      reservations:
        this.reservationService
          .getAll()
          .pipe(
            catchError(
              () => {

                throw new Error(
                  'No se pudieron cargar las reservas.'
                );

              }
            )
          ),

      consumptions:
        this.consumptionService
          .getAll()
          .pipe(
            catchError(
              () => {

                throw new Error(
                  'No se pudieron cargar los consumos.'
                );

              }
            )
          )

    }).subscribe({

      next: data => {

        this.movements =
          data.movements;

        this.reservations =
          data.reservations;

        this.consumptions =
          data.consumptions;

        this.loadLocalCashData();

        this.buildBook();

        this.calculateTotals();

        this.loading = false;

        this.cdr.detectChanges();
      },

      error: error => {

        this.loading = false;

        this.errorMessage =
          error?.message ||
          'No se pudo cargar la información de caja.';

        this.movements = [];

        this.buildBook();

        this.calculateTotals();

        this.cdr.detectChanges();
      }

    });
  }

  // =========================================================
  // ESTE MES
  // =========================================================

  loadCurrentMonth(): void {

    this.loading = true;

    this.errorMessage = '';

    this.successMessage = '';

    const now =
      this.dateFromString(
        this.getLocalDate()
      );

    const year =
      now.getFullYear();

    const month =
      now.getMonth();

    const days =
      new Date(
        year,
        month + 1,
        0
      ).getDate();

    const requests:
      Observable<CashMovement[]>[] = [];

    for (
      let day = 1;
      day <= days;
      day++
    ) {

      const date =
        this.toDateInput(
          new Date(
            year,
            month,
            day
          )
        );

      requests.push(
        this.loadMovementsForDate(
          date
        )
      );
    }

    forkJoin(requests)
      .subscribe({

        next: results => {

          this.movements =
            results.flat();

          this.reservationService
            .getAll()
            .pipe(
              catchError(
                () => {

                  throw new Error(
                    'No se pudieron cargar las reservas.'
                  );

                }
              )
            )
            .subscribe({

              next: reservations => {

                this.reservations =
                  reservations;

                this.consumptionService
                  .getAll()
                  .pipe(
                    catchError(
                      () => {

                        throw new Error(
                          'No se pudieron cargar los consumos.'
                        );

                      }
                    )
                  )
                  .subscribe({

                    next: consumptions => {

                      this.consumptions =
                        consumptions;

                      this.loadLocalCashDataForMonth();

                      this.buildMonthBook();

                      this.calculateMonthTotals();

                      this.loading = false;

                      this.cdr.detectChanges();
                    },

                    error: error => {

                      this.loading = false;

                      this.errorMessage =
                        error?.message ||
                        'No se pudieron cargar los consumos del mes.';

                      this.cdr.detectChanges();
                    }

                  });

              },

              error: error => {

                this.loading = false;

                this.errorMessage =
                  error?.message ||
                  'No se pudieron cargar las reservas del mes.';

                this.cdr.detectChanges();
              }

            });

        },

        error: error => {

          this.loading = false;

          this.errorMessage =
            error?.message ||
            'No se pudo cargar el historial mensual.';

          this.cdr.detectChanges();
        }

      });
  }

  // =========================================================
  // LOCAL STORAGE
  // =========================================================

  private saveCashViewState(): void {

    localStorage.setItem(
      this.CASH_FILTER_STORAGE_KEY,
      this.timeFilter
    );

    localStorage.setItem(
      this.CASH_DATE_STORAGE_KEY,
      this.selectedDate
    );
  }

  private restoreCashViewState(): void {

    const savedFilter =
      localStorage.getItem(
        this.CASH_FILTER_STORAGE_KEY
      ) as TimeFilter | null;

    const savedDate =
      localStorage.getItem(
        this.CASH_DATE_STORAGE_KEY
      );

    if (
      savedFilter === 'HOY' ||
      savedFilter === 'AYER' ||
      savedFilter === 'ESTE_MES' ||
      savedFilter === 'FECHA'
    ) {

      this.timeFilter =
        savedFilter;
    }

    if (
      savedDate &&
      /^\d{4}-\d{2}-\d{2}$/.test(savedDate)
    ) {

      this.selectedDate =
        savedDate;
    }
  }

  private loadLocalCashData(): void {

    this.shifts =
      this.shiftService
        .getShiftsByDate(
          this.selectedDate
        );

    this.expenses =
      this.shiftService
        .getExpensesByDate(
          this.selectedDate
        );

    this.normalExpenses =
      this.shiftService
        .getNormalExpensesByDate(
          this.selectedDate
        );

    this.personalExpenses =
      this.shiftService
        .getPersonalExpensesByDate(
          this.selectedDate
        );

    this.personalHotelExpenses =
      this.shiftService
        .getPersonalHotelExpensesByDate(
          this.selectedDate
        );

    this.personalWorkerExpenses =
      this.shiftService
        .getPersonalWorkerExpensesByDate(
          this.selectedDate
        );

    this.personalAccountExpenses =
      this.shiftService
        .getPersonalAccountExpensesByDate(
          this.selectedDate
        );

    this.currentShift =
      this.shiftService
        .getOpenShift();

    this.lastHandoffAmount =
      this.shiftService
        .getLastHandoffAmount(
          this.selectedDate
        );

    this.calculatePersonalTotals();
  }

  private loadLocalCashDataForMonth(): void {

    const allExpenses =
      this.shiftService
        .getAllExpenses();

    const currentMonth =
      this.selectedDate.substring(
        0,
        7
      );

    this.expenses =
      allExpenses.filter(
        expense =>
          this.getDateFromIso(
            expense.createdAt
          ).startsWith(
            currentMonth
          )
      );

    this.normalExpenses =
      this.expenses.filter(
        expense =>
          expense.type ===
          'NORMAL'
      );

    this.personalExpenses =
      this.expenses.filter(
        expense =>
          expense.type ===
          'PERSONAL'
      );

    this.personalHotelExpenses =
      this.personalExpenses.filter(
        expense =>
          expense.cashEffect ===
          'EGRESO'
      );

    this.personalWorkerExpenses =
      this.personalExpenses.filter(
        expense =>
          expense.cashEffect ===
          'INGRESO'
      );

    this.personalAccountExpenses =
      this.personalExpenses.filter(
        expense =>
          expense.cashEffect ===
          'NINGUNO' ||
          expense.personalStatus ===
          'A_CUENTA'
      );

    this.shifts =
      this.shiftService
        .getShiftsByDate(
          this.selectedDate
        );

    this.currentShift =
      this.shiftService
        .getOpenShift();

    this.lastHandoffAmount =
      this.shiftService
        .getLastHandoffAmount(
          this.selectedDate
        );

    this.calculatePersonalTotals();
  }

  private calculatePersonalTotals(): void {

    this.totalPersonalExpenses =
      this.personalExpenses.reduce(
        (
          total,
          expense
        ) =>
          total +
          Number(
            expense.amount || 0
          ),
        0
      );

    this.totalPersonalHotelExpenses =
      this.personalHotelExpenses.reduce(
        (
          total,
          expense
        ) =>
          total +
          Number(
            expense.amount || 0
          ),
        0
      );

    this.totalPersonalWorkerExpenses =
      this.personalWorkerExpenses.reduce(
        (
          total,
          expense
        ) =>
          total +
          Number(
            expense.amount || 0
          ),
        0
      );

    this.totalPersonalAccountExpenses =
      this.personalAccountExpenses.reduce(
        (
          total,
          expense
        ) =>
          total +
          Number(
            expense.amount || 0
          ),
        0
      );

    this.totalNormalExpenses =
      this.normalExpenses.reduce(
        (
          total,
          expense
        ) =>
          total +
          Number(
            expense.amount || 0
          ),
        0
      );

    this.personalStockUnits =
      this.personalExpenses.reduce(
        (
          total,
          expense
        ) =>
          total +
          Number(
            expense.quantity || 0
          ),
        0
      );
  }

  // =========================================================
  // CONSTRUIR LIBRO
  // =========================================================

  private buildBook(): void {

    const rows: CashBookRow[] = [];

    const shifts =
      [...this.shifts]
        .sort(
          (a, b) =>
            new Date(
              a.startedAt
            ).getTime() -
            new Date(
              b.startedAt
            ).getTime()
        );

    const dayMovements =
      this.movements.filter(
        movement =>
          this.getDateFromIso(
            movement.createdAt
          ) ===
          this.selectedDate
      );

    const dayExpenses =
      [...this.expenses];

    let runningBalance = 0;

    // =======================================================
    // APERTURA
    // =======================================================

    if (
      shifts.length > 0
    ) {

      runningBalance =
        Number(
          shifts[0].openingBalance
        );

      this.initialBalance =
        Number(
          shifts[0].openingBalance
        );

      rows.push({

        id:
          `opening-${shifts[0].id}`,

        createdAt:
          shifts[0].startedAt,

        type:
          'APERTURA',

        room:
          '—',

        reference:
          `T-${shifts[0].id.slice(-5)}`,

        description:
          `Apertura de caja · ${shifts[0].personName}`,

        cash:
          Number(
            shifts[0].openingBalance
          ),

        PLIN:
          0,

        balance:
          runningBalance,

        clickable:
          false,

        shift:
          shifts[0]

      });

    } else {

      this.initialBalance =
        0;
    }

    const events: Array<{
      date: string;
      priority: number;
      row: CashBookRow;
    }> = [];

    // =======================================================
    // RESERVAS Y CONSUMOS
    // =======================================================

    for (
      const movement of dayMovements
    ) {

      const amount =
        Number(
          movement.amount || 0
        );

      const cash =
        movement.paymentMethod ===
          'EFECTIVO'
          ? amount
          : 0;

      const PLIN =
        movement.paymentMethod ===
          'PLIN'
          ? amount
          : 0;

      let room =
        '—';

      if (
        movement.movementType ===
        'RESERVA'
      ) {

        const reservation =
          this.reservations.find(
            item =>
              Number(item.id) ===
              Number(movement.referenceId)
          );

        room =
          reservation
            ?.room
            ?.roomNumber ||
          '—';
      }

      if (
        movement.movementType ===
        'CONSUMO'
      ) {

        const consumption =
          this.consumptions.find(
            item =>
              Number(item.id) ===
              Number(movement.referenceId)
          );

        room =
          consumption
            ?.reservation
            ?.room
            ?.roomNumber ||
          '—';
      }

      events.push({

        date:
          movement.createdAt,

        priority:
          2,

        row: {

          id:
            `movement-${movement.id}`,

          createdAt:
            movement.createdAt,

          type:
            movement.movementType,

          room,

          reference:
            this.getMovementReference(
              movement
            ),

          description:
            movement.description ||
            (
              movement.movementType ===
                'RESERVA'
                ? 'Pago de reserva'
                : 'Pago de consumo'
            ),

          cash,

          PLIN,

          balance:
            0,

          clickable:
            true,

          referenceId:
            movement.referenceId,

          movement

        }

      });
    }

    // =======================================================
    // GASTOS Y CONSUMOS DE PERSONAL
    // =======================================================

    for (
      const expense of dayExpenses
    ) {

      const isPersonal =
        expense.type ===
        'PERSONAL';

      const hasProduct =
        expense.productId !==
        undefined &&
        expense.productId !==
        null;

      // -----------------------------------------------------
      // PERSONAL PAGADO POR TRABAJADOR
      // -----------------------------------------------------

      if (
        isPersonal &&
        expense.cashEffect ===
        'INGRESO'
      ) {

        events.push({

          date:
            expense.createdAt,

          priority:
            3,

          row: {

            id:
              `personal-worker-${expense.id}`,

            createdAt:
              expense.createdAt,

            type:
              'CONSUMO_PERSONAL',

            room:
              '—',

            reference:
              'PER-' +
              expense.id.slice(-5),

            description:
              hasProduct
                ? `Consumo personal · ${expense.productName || expense.description}`
                : expense.description,

            cash:
              Number(
                expense.amount || 0
              ),

            PLIN:
              0,

            balance:
              0,

            clickable:
              true,

            expense

          }

        });

        continue;
      }

      // -----------------------------------------------------
      // PERSONAL A CUENTA
      // -----------------------------------------------------

      if (
        isPersonal &&
        (
          expense.cashEffect ===
          'NINGUNO' ||
          expense.personalStatus ===
          'A_CUENTA'
        )
      ) {

        events.push({

          date:
            expense.createdAt,

          priority:
            3,

          row: {

            id:
              `personal-account-${expense.id}`,

            createdAt:
              expense.createdAt,

            type:
              'CONSUMO_PERSONAL',

            room:
              '—',

            reference:
              'PER-' +
              expense.id.slice(-5),

            description:
              hasProduct
                ? `Consumo personal · ${expense.productName || expense.description} · A cuenta`
                : `${expense.description} · A cuenta`,

            cash:
              0,

            PLIN:
              0,

            balance:
              0,

            clickable:
              true,

            expense

          }

        });

        continue;
      }

      // -----------------------------------------------------
      // PERSONAL PAGADO DESDE CAJA
      // -----------------------------------------------------

      if (
        isPersonal &&
        expense.cashEffect ===
        'EGRESO'
      ) {

        events.push({

          date:
            expense.createdAt,

          priority:
            3,

          row: {

            id:
              `personal-hotel-${expense.id}`,

            createdAt:
              expense.createdAt,

            type:
              'CONSUMO_PERSONAL',

            room:
              '—',

            reference:
              'PER-' +
              expense.id.slice(-5),

            description:
              hasProduct
                ? `Consumo personal · ${expense.productName || expense.description}`
                : `Gasto de personal · ${expense.description}`,

            cash:
              -Number(
                expense.amount || 0
              ),

            PLIN:
              0,

            balance:
              0,

            clickable:
              true,

            expense

          }

        });

        continue;
      }

      // -----------------------------------------------------
      // COMPATIBILIDAD CON REGISTROS ANTIGUOS
      // -----------------------------------------------------

      if (
        isPersonal
      ) {

        if (
          expense.paidBy ===
          'TRABAJADOR'
        ) {

          events.push({

            date:
              expense.createdAt,

            priority:
              3,

            row: {

              id:
                `personal-old-worker-${expense.id}`,

              createdAt:
                expense.createdAt,

              type:
                'CONSUMO_PERSONAL',

              room:
                '—',

              reference:
                'PER-' +
                expense.id.slice(-5),

              description:
                expense.description,

              cash:
                Number(
                  expense.amount || 0
                ),

              PLIN:
                0,

              balance:
                0,

              clickable:
                true,

              expense

            }

          });

        } else {

          events.push({

            date:
              expense.createdAt,

            priority:
              3,

            row: {

              id:
                `personal-old-hotel-${expense.id}`,

              createdAt:
                expense.createdAt,

              type:
                'CONSUMO_PERSONAL',

              room:
                '—',

              reference:
                'PER-' +
                expense.id.slice(-5),

              description:
                `Gasto de personal · ${expense.description}`,

              cash:
                -Number(
                  expense.amount || 0
                ),

              PLIN:
                0,

              balance:
                0,

              clickable:
                true,

              expense

            }

          });
        }

        continue;
      }

      // -----------------------------------------------------
      // EGRESO NORMAL
      // -----------------------------------------------------

      events.push({

        date:
          expense.createdAt,

        priority:
          3,

        row: {

          id:
            `expense-${expense.id}`,

          createdAt:
            expense.createdAt,

          type:
            'EGRESO',

          room:
            '—',

          reference:
            'EG-' +
            expense.id.slice(-5),

          description:
            expense.description,

          cash:
            -Number(
              expense.amount || 0
            ),

          PLIN:
            0,

          balance:
            0,

          clickable:
            true,

          expense

        }

      });
    }

    // =======================================================
    // CIERRE / ENTREGA
    // =======================================================

    for (
      const shift of shifts
    ) {

      if (
        !shift.endedAt
      ) {
        continue;
      }

      events.push({

        date:
          shift.endedAt,

        priority:
          4,

        row: {

          id:
            `handoff-${shift.id}`,

          createdAt:
            shift.endedAt,

          type:
            'ENTREGA',

          room:
            '—',

          reference:
            `T-${shift.id.slice(-5)}`,

          description:
            `Cierre de caja · ${shift.personName}`,

          cash:
            0,

          PLIN:
            0,

          balance:
            Number(
              shift.countedCash ??
              shift.expectedCash
            ),

          clickable:
            false,

          shift

        }

      });
    }

    // =======================================================
    // ORDENAR
    // =======================================================

    events.sort(
      (a, b) => {

        const difference =
          new Date(
            b.date
          ).getTime() -
          new Date(
            a.date
          ).getTime();

        if (
          difference !== 0
        ) {
          return difference;
        }

        return (
          b.priority -
          a.priority
        );
      }
    );

    // =======================================================
    // SALDO CORRIDO
    // =======================================================

    for (
      const event of events
    ) {

      const row =
        event.row;

      if (
        row.type ===
        'ENTREGA'
      ) {

        runningBalance =
          Number(
            row.shift
              ?.countedCash ??
            row.shift
              ?.expectedCash ??
            runningBalance
          );

      } else {

        runningBalance +=
          row.cash;
      }

      row.balance =
        this.roundMoney(
          runningBalance
        );

      rows.push(
        row
      );
    }

    this.bookRows =
      rows;

    this.applyMovementFilter();
  }

  // =========================================================
  // LIBRO MENSUAL
  // =========================================================

  private buildMonthBook(): void {

    const rows: CashBookRow[] = [];

    const sortedMovements =
      [...this.movements]
        .sort(
          (a, b) =>
            new Date(
              b.createdAt
            ).getTime() -
            new Date(
              a.createdAt
            ).getTime()
        );

    // -------------------------------------------------------
    // HABITACIONES / CONSUMOS
    // -------------------------------------------------------

    for (
      const movement of sortedMovements
    ) {

      const room =
        this.getMovementRoom(
          movement
        );

      rows.push({

        id:
          `month-${movement.id}`,

        createdAt:
          movement.createdAt,

        type:
          movement.movementType,

        room,

        reference:
          this.getMovementReference(
            movement
          ),

        description:
          movement.description ||
          (
            movement.movementType ===
              'RESERVA'
              ? 'Pago de reserva'
              : 'Pago de consumo'
          ),

        cash:
          movement.paymentMethod ===
            'EFECTIVO'
            ? Number(
              movement.amount || 0
            )
            : 0,

        PLIN:
          movement.paymentMethod ===
            'PLIN'
            ? Number(
              movement.amount || 0
            )
            : 0,

        balance:
          0,

        clickable:
          true,

        referenceId:
          movement.referenceId,

        movement

      });
    }

    // -------------------------------------------------------
    // GASTOS DEL MES
    // -------------------------------------------------------

    const monthExpenses =
      [...this.expenses];

    for (
      const expense of monthExpenses
    ) {

      const isPersonal =
        expense.type ===
        'PERSONAL';

      const hasProduct =
        expense.productId !==
        undefined &&
        expense.productId !==
        null;

      // -----------------------------------------------------
      // PERSONAL PAGADO POR TRABAJADOR
      // -----------------------------------------------------

      if (
        isPersonal &&
        expense.cashEffect ===
        'INGRESO'
      ) {

        rows.push({

          id:
            `month-personal-worker-${expense.id}`,

          createdAt:
            expense.createdAt,

          type:
            'CONSUMO_PERSONAL',

          room:
            '—',

          reference:
            'PER-' +
            expense.id.slice(-5),

          description:
            hasProduct
              ? `Consumo personal · ${expense.productName || expense.description}`
              : expense.description,

          cash:
            Number(
              expense.amount || 0
            ),

          PLIN:
            0,

          balance:
            0,

          clickable:
            true,

          expense

        });

        continue;
      }

      // -----------------------------------------------------
      // PERSONAL A CUENTA
      // -----------------------------------------------------

      if (
        isPersonal &&
        (
          expense.cashEffect ===
          'NINGUNO' ||
          expense.personalStatus ===
          'A_CUENTA'
        )
      ) {

        rows.push({

          id:
            `month-personal-account-${expense.id}`,

          createdAt:
            expense.createdAt,

          type:
            'CONSUMO_PERSONAL',

          room:
            '—',

          reference:
            'PER-' +
            expense.id.slice(-5),

          description:
            hasProduct
              ? `Consumo personal · ${expense.productName || expense.description} · A cuenta`
              : `${expense.description} · A cuenta`,

          cash:
            0,

          PLIN:
            0,

          balance:
            0,

          clickable:
            true,

          expense

        });

        continue;
      }

      // -----------------------------------------------------
      // PERSONAL PAGADO DESDE CAJA
      // -----------------------------------------------------

      if (
        isPersonal &&
        expense.cashEffect ===
        'EGRESO'
      ) {

        rows.push({

          id:
            `month-personal-hotel-${expense.id}`,

          createdAt:
            expense.createdAt,

          type:
            'CONSUMO_PERSONAL',

          room:
            '—',

          reference:
            'PER-' +
            expense.id.slice(-5),

          description:
            hasProduct
              ? `Consumo personal · ${expense.productName || expense.description}`
              : `Gasto de personal · ${expense.description}`,

          cash:
            -Number(
              expense.amount || 0
            ),

          PLIN:
            0,

          balance:
            0,

          clickable:
            true,

          expense

        });

        continue;
      }

      // -----------------------------------------------------
      // COMPATIBILIDAD CON REGISTROS ANTIGUOS
      // -----------------------------------------------------

      if (
        isPersonal
      ) {

        rows.push({

          id:
            `month-personal-old-${expense.id}`,

          createdAt:
            expense.createdAt,

          type:
            'CONSUMO_PERSONAL',

          room:
            '—',

          reference:
            'PER-' +
            expense.id.slice(-5),

          description:
            expense.description,

          cash:
            expense.paidBy ===
              'TRABAJADOR'
              ? Number(
                expense.amount || 0
              )
              : -Number(
                expense.amount || 0
              ),

          PLIN:
            0,

          balance:
            0,

          clickable:
            true,

          expense

        });

        continue;
      }

      // -----------------------------------------------------
      // EGRESO NORMAL
      // -----------------------------------------------------

      rows.push({

        id:
          `month-expense-${expense.id}`,

        createdAt:
          expense.createdAt,

        type:
          'EGRESO',

        room:
          '—',

        reference:
          'EG-' +
          expense.id.slice(-5),

        description:
          expense.description,

        cash:
          -Number(
            expense.amount || 0
          ),

        PLIN:
          0,

        balance:
          0,

        clickable:
          true,

        expense

      });
    }

    // =======================================================
    // ORDENAR TODO EL MES
    // =======================================================

    rows.sort(
      (a, b) =>
        new Date(
          b.createdAt
        ).getTime() -
        new Date(
          a.createdAt
        ).getTime()
    );

    this.bookRows =
      rows;

    this.applyMovementFilter();
  }

  // =========================================================
  // FILTROS
  // =========================================================

  setMovementFilter(
    filter: MovementFilter
  ): void {

    this.movementFilter =
      filter;

    this.applyMovementFilter();
  }

  private applyMovementFilter(): void {

    if (
      this.movementFilter ===
      'TODOS'
    ) {

      this.filteredRows =
        [...this.bookRows];

      return;
    }

    this.filteredRows =
      this.bookRows.filter(
        row => {

          switch (
          this.movementFilter
          ) {

            case 'EFECTIVO':

              return (
                row.cash !== 0
              );

            case 'PLIN':

              return (
                row.PLIN !== 0
              );

            case 'CONSUMO_PERSONAL':

              return (
                row.type ===
                'CONSUMO_PERSONAL'
              );

            case 'INGRESO':

              return (
                row.type ===
                'RESERVA' ||
                row.type ===
                'CONSUMO' ||
                (
                  row.type ===
                  'CONSUMO_PERSONAL' &&
                  row.cash > 0
                )
              );

            case 'EGRESO':

              return (
                row.type ===
                'EGRESO' ||
                (
                  row.type ===
                  'CONSUMO_PERSONAL' &&
                  row.cash < 0
                )
              );

            default:

              return true;
          }
        }
      );
  }

  // =========================================================
  // TOTALES
  // =========================================================

  private calculateTotals(): void {

    this.totalEfectivo = 0;

    this.totalPLIN = 0;

    // =======================================================
    // INGRESOS DE HABITACIONES Y CLIENTES
    // =======================================================

    for (
      const movement of this.movements
    ) {

      if (
        movement.paymentMethod ===
        'EFECTIVO'
      ) {

        this.totalEfectivo +=
          Number(
            movement.amount || 0
          );
      }

      if (
        movement.paymentMethod ===
        'PLIN'
      ) {

        this.totalPLIN +=
          Number(
            movement.amount || 0
          );
      }
    }

    // =======================================================
    // EGRESOS
    // =======================================================

    this.totalNormalExpenses =
      this.normalExpenses.reduce(
        (
          total,
          expense
        ) =>
          total +
          Number(
            expense.amount || 0
          ),
        0
      );

    this.totalPersonalHotelExpenses =
      this.personalHotelExpenses.reduce(
        (
          total,
          expense
        ) =>
          total +
          Number(
            expense.amount || 0
          ),
        0
      );

    // =======================================================
    // INGRESO PERSONAL PAGADO POR TRABAJADOR
    // =======================================================

    this.totalPersonalWorkerExpenses =
      this.personalWorkerExpenses.reduce(
        (
          total,
          expense
        ) =>
          total +
          Number(
            expense.amount || 0
          ),
        0
      );

    // =======================================================
    // A CUENTA NO AFECTA CAJA
    // =======================================================

    this.totalExpenses =
      this.roundMoney(
        this.totalNormalExpenses +
        this.totalPersonalHotelExpenses
      );

    // =======================================================
    // EFECTIVO REAL RECIBIDO
    // =======================================================

    this.cashCollected =
      this.roundMoney(
        this.totalEfectivo +
        this.totalPersonalWorkerExpenses
      );

    // =======================================================
    // INGRESOS TOTALES
    // =======================================================

    this.totalGeneral =
      this.roundMoney(
        this.totalEfectivo +
        this.totalPLIN +
        this.totalPersonalWorkerExpenses
      );

    // =======================================================
    // EFECTIVO ESPERADO
    // =======================================================

    this.expectedCash =
      this.roundMoney(
        this.initialBalance +
        this.cashCollected -
        this.totalExpenses
      );

    this.finalCash =
      this.expectedCash;
  }

  private calculateMonthTotals(): void {

    this.totalEfectivo = 0;

    this.totalPLIN = 0;

    for (
      const movement of this.movements
    ) {

      if (
        movement.paymentMethod ===
        'EFECTIVO'
      ) {

        this.totalEfectivo +=
          Number(
            movement.amount || 0
          );
      }

      if (
        movement.paymentMethod ===
        'PLIN'
      ) {

        this.totalPLIN +=
          Number(
            movement.amount || 0
          );
      }
    }

    this.calculatePersonalTotals();

    this.totalGeneral =
      this.roundMoney(
        this.totalEfectivo +
        this.totalPLIN +
        this.totalPersonalWorkerExpenses
      );

    this.totalExpenses =
      this.roundMoney(
        this.totalNormalExpenses +
        this.totalPersonalHotelExpenses
      );

    this.cashCollected =
      this.roundMoney(
        this.totalEfectivo +
        this.totalPersonalWorkerExpenses
      );

    this.expectedCash = 0;

    this.finalCash = 0;
  }

  // =========================================================
  // APERTURA
  // =========================================================

  openOpenShiftModal(): void {

    this.errorMessage = '';

    this.successMessage = '';

    this.currentShift =
      this.shiftService
        .getOpenShift();

    if (
      this.currentShift
    ) {

      this.errorMessage =
        `Ya existe un turno abierto a cargo de ${this.currentShift.personName}.`;

      return;
    }

    this.lastHandoffAmount =
      this.shiftService
        .getLastHandoffAmount(
          this.selectedDate
        );

    this.openingAmount =
      this.lastHandoffAmount;

    this.openingPersonName =
      '';

    this.showOpenShiftModal =
      true;
  }

  closeOpenShiftModal(): void {

    this.showOpenShiftModal =
      false;
  }

  confirmOpenShift(): void {

    const name =
      this.openingPersonName
        .trim();

    if (!name) {

      this.errorMessage =
        'Ingresa el nombre de la persona que toma la caja.';

      return;
    }

    if (
      this.openingAmount < 0 ||
      Number.isNaN(
        Number(
          this.openingAmount
        )
      )
    ) {

      this.errorMessage =
        'El monto inicial no es válido.';

      return;
    }

    const existing =
      this.shiftService
        .getOpenShift();

    if (
      existing
    ) {

      this.errorMessage =
        `La caja ya está abierta por ${existing.personName}.`;

      return;
    }

    const shift =
      this.shiftService.openShift({

        personName:
          name,

        openingBalance:
          this.roundMoney(
            Number(
              this.openingAmount
            )
          )

      }, this.selectedDate);

    if (!shift) {

      this.errorMessage =
        'No se pudo abrir el turno.';

      return;
    }

    this.showOpenShiftModal =
      false;

    this.successMessage =
      `Turno iniciado por ${name}.`;

    this.load();
  }

  // =========================================================
  // CIERRE DE CAJA
  // =========================================================

  openHandoffModal(): void {

    this.currentShift =
      this.shiftService
        .getOpenShift();

    if (
      !this.currentShift
    ) {

      this.errorMessage =
        'No hay una caja abierta para cerrar.';

      return;
    }

    this.recalculateExpectedCash();

    this.countedAmount =
      this.expectedCash;

    this.difference =
      0;

    this.handoffPersonName =
      this.currentShift.personName;

    this.showHandoffModal =
      true;
  }

  closeHandoffModal(): void {

    this.showHandoffModal =
      false;
  }

  onCountedAmountChange(): void {

    const counted =
      Number(
        this.countedAmount || 0
      );

    this.difference =
      this.roundMoney(
        counted -
        this.expectedCash
      );
  }

  confirmHandoff(): void {

    if (
      !this.currentShift
    ) {
      return;
    }

    const counted =
      Number(
        this.countedAmount
      );

    if (
      Number.isNaN(
        counted
      ) ||
      counted < 0
    ) {

      this.errorMessage =
        'Ingresa un monto contado válido.';

      return;
    }

    this.recalculateExpectedCash();

    const result =
      this.shiftService.handoff(
        this.currentShift.id,
        counted
      );

    if (!result) {

      this.errorMessage =
        'No se pudo registrar el cierre de caja.';

      return;
    }

    this.showHandoffModal =
      false;

    this.successMessage =
      `Caja cerrada por ${this.currentShift.personName}. Efectivo encontrado: S/ ${this.formatMoney(counted)}.`;

    this.load();
  }

  // =========================================================
  // EGRESO NORMAL
  // =========================================================

  openExpenseModal(): void {

    this.expenseAmount =
      0;

    this.expenseDescription =
      '';

    this.errorMessage =
      '';

    this.showExpenseModal =
      true;
  }

  closeExpenseModal(): void {

    this.showExpenseModal =
      false;
  }

  confirmExpense(): void {

    const amount =
      Number(
        this.expenseAmount
      );

    const description =
      this.expenseDescription
        .trim();

    if (
      Number.isNaN(
        amount
      ) ||
      amount <= 0
    ) {

      this.errorMessage =
        'Ingresa un monto de egreso válido.';

      return;
    }

    if (!description) {

      this.errorMessage =
        'Ingresa una descripción del egreso.';

      return;
    }

    this.shiftService.addExpense({

      date:
        this.selectedDate,

      amount:
        this.roundMoney(
          amount
        ),

      description,

      type:
        'NORMAL',

      paidBy:
        'HOTEL',

      cashEffect:
        'EGRESO'

    });

    this.showExpenseModal =
      false;

    this.successMessage =
      'Egreso registrado correctamente.';

    this.load();
  }

  // =========================================================
  // SALDO
  // =========================================================

  private recalculateExpectedCash(): void {

    this.calculateTotals();

    this.expectedCash =
      this.roundMoney(
        this.initialBalance +
        this.cashCollected -
        this.totalExpenses
      );

    this.finalCash =
      this.expectedCash;

    if (
      this.currentShift
    ) {

      this.shiftService
        .updateExpectedCash(
          this.currentShift.id,
          this.expectedCash
        );
    }
  }

  // =========================================================
  // DETALLE DE OPERACIÓN
  // =========================================================

  openOperation(
    row: CashBookRow
  ): void {

    if (row.expense) {

      this.openPersonalExpense(
        row.expense
      );

      return;
    }

    if (
      !row.clickable ||
      !row.referenceId ||
      !row.movement
    ) {

      return;
    }

    this.loading = true;

    if (
      row.type ===
      'RESERVA'
    ) {

      forkJoin({

        reservation:
          this.reservationService
            .getById(
              row.referenceId
            ),

        consumptions:
          this.consumptionService
            .getByReservation(
              row.referenceId
            )

      }).subscribe({

        next: data => {

          this.selectedOperation =
            this.buildOperationDetail(
              data.reservation,
              data.consumptions,
              'RESERVA'
            );

          this.showOperationModal =
            true;

          this.loading = false;

          this.cdr.detectChanges();
        },

        error: () => {

          this.loading = false;

          this.errorMessage =
            'No se pudo cargar el detalle de la reserva.';
        }

      });

      return;
    }

    this.consumptionService
      .getById(
        row.referenceId
      )
      .subscribe({

        next: consumption => {

          this.selectedOperation =
            this.buildOperationDetail(
              consumption.reservation,
              [consumption],
              'CONSUMO',
              consumption
            );

          this.showOperationModal =
            true;

          this.loading = false;

          this.cdr.detectChanges();
        },

        error: () => {

          this.loading = false;

          this.errorMessage =
            'No se pudo cargar el detalle del consumo.';
        }

      });
  }

  closeOperationModal(): void {

    this.showOperationModal =
      false;

    this.selectedOperation =
      null;
  }

  // =========================================================
  // DETALLE GASTO PERSONAL
  // =========================================================

  openPersonalExpense(
    expense: CashExpense
  ): void {

    const quantity =
      Number(
        expense.quantity || 0
      );

    const affectsCash =
      expense.cashEffect ===
      'EGRESO';

    this.selectedPersonalExpense = {

      expense,

      affectsCash,

      stockQuantity:
        quantity,

      paymentLabel:
        expense.cashEffect ===
          'INGRESO'
          ? 'Dinero propio'
          : expense.cashEffect ===
            'NINGUNO'
            ? 'A cuenta'
            : 'Caja del hotel'

    };

    this.showPersonalExpenseModal =
      true;

    this.cdr.detectChanges();
  }

  closePersonalExpenseModal(): void {

    this.showPersonalExpenseModal =
      false;

    this.selectedPersonalExpense =
      null;
  }

  // =========================================================
  // DETALLE DE RESERVA / CONSUMO
  // =========================================================

  private buildOperationDetail(
    reservation: Reservation,
    consumptions: Consumption[],
    type:
      | 'RESERVA'
      | 'CONSUMO',
    selectedConsumption?: Consumption
  ): OperationDetail {

    const selected =
      selectedConsumption;

    const totalRoom =
      type === 'RESERVA'
        ? Number(
          reservation.roomPrice || 0
        )
        : 0;

    const totalConsumption =
      consumptions.reduce(
        (
          total,
          consumption
        ) =>
          total +
          Number(
            consumption.total || 0
          ),
        0
      );

    let cashTotal = 0;

    let PLINTotal = 0;

    if (
      type ===
      'RESERVA'
    ) {

      if (
        reservation.paymentMethod ===
        'EFECTIVO'
      ) {

        cashTotal +=
          totalRoom;
      }

      if (
        reservation.paymentMethod ===
        'PLIN'
      ) {

        PLINTotal +=
          totalRoom;
      }
    }

    for (
      const consumption of consumptions
    ) {

      if (
        consumption.paymentStatus !==
        'PAGADO'
      ) {
        continue;
      }

      if (
        consumption.paymentMethod ===
        'EFECTIVO'
      ) {

        cashTotal +=
          Number(
            consumption.total || 0
          );
      }

      if (
        consumption.paymentMethod ===
        'PLIN'
      ) {

        PLINTotal +=
          Number(
            consumption.total || 0
          );
      }
    }

    return {

      type,

      reservation,

      consumption:
        selected,

      consumptions,

      totalRoom,

      totalConsumption,

      total:
        totalRoom +
        totalConsumption,

      cashTotal,

      PLINTotal

    };
  }

  // =========================================================
  // HELPERS
  // =========================================================

  getMovementReference(
    movement: CashMovement
  ): string {

    return movement.movementType ===
      'RESERVA'
      ? `RES-${movement.referenceId}`
      : `CON-${movement.referenceId}`;
  }

  getMovementRoom(
    movement: CashMovement
  ): string {

    if (
      movement.movementType ===
      'RESERVA'
    ) {

      return (
        this.reservations.find(
          reservation =>
            Number(reservation.id) ===
            Number(movement.referenceId)
        )
          ?.room
          ?.roomNumber ||
        '—'
      );
    }

    return (
      this.consumptions.find(
        consumption =>
          Number(consumption.id) ===
          Number(movement.referenceId)
      )
        ?.reservation
        ?.room
        ?.roomNumber ||
      '—'
    );
  }

  getMovementLabel(
    type: string
  ): string {

    switch (type) {

      case 'APERTURA':
        return 'Apertura';

      case 'RESERVA':
        return 'Reserva';

      case 'CONSUMO':
        return 'Consumo';

      case 'CONSUMO_PERSONAL':
        return 'Consumo personal';

      case 'EGRESO':
        return 'Egreso';

      case 'ENTREGA':
        return 'Cierre';

      default:
        return type;
    }
  }

  getPaymentLabel(
    method?: PaymentMethod
  ): string {

    if (!method) {
      return '—';
    }

    return method ===
      'EFECTIVO'
      ? 'Efectivo'
      : 'PLIN';
  }

  getPersonalPaymentLabel(
    expense: CashExpense
  ): string {

    if (
      expense.cashEffect ===
      'INGRESO'
    ) {

      return 'Dinero propio';
    }

    if (
      expense.cashEffect ===
      'NINGUNO' ||
      expense.personalStatus ===
      'A_CUENTA'
    ) {

      return 'A cuenta';
    }

    return 'Caja del hotel';
  }

  getPersonalExpenseStock(
    expense: CashExpense
  ): number {

    return Number(
      expense.quantity || 0
    );
  }

  personalExpenseAffectsCash(
    expense: CashExpense
  ): boolean {

    return expense.cashEffect ===
      'EGRESO';
  }

  getExpenseTypeLabel(
    expense: CashExpense
  ): string {

    if (
      expense.type ===
      'PERSONAL'
    ) {

      return 'Consumo de personal';
    }

    return 'Egreso';
  }

  getShiftStatus(
    shift: CashShift
  ): string {

    return shift.status ===
      'ABIERTO'
      ? 'EN CURSO'
      : 'CERRADO';
  }

  getShiftDifference(
    shift: CashShift
  ): number {

    return Number(
      shift.difference || 0
    );
  }

  getDifferenceClass(
    difference: number
  ): string {

    if (
      difference === 0
    ) {

      return 'difference-ok';
    }

    if (
      difference > 0
    ) {

      return 'difference-positive';
    }

    return 'difference-negative';
  }

  isToday(): boolean {

    return (
      this.selectedDate ===
      this.getLocalDate()
    );
  }

  get currentShiftExpected(): number {

    if (
      !this.currentShift
    ) {

      return 0;
    }

    return this.expectedCash;
  }

  // =========================================================
  // GETTERS PÚBLICOS PARA HTML
  // =========================================================

  get cashExpenseCount(): number {

    return (
      this.normalExpenses.length +
      this.personalHotelExpenses.length
    );
  }

  get totalMovementCount(): number {

    return (
      this.movements.length +
      this.cashExpenseCount +
      this.personalWorkerExpenses.length +
      this.personalAccountExpenses.length
    );
  }

  // =========================================================
  // ABS
  // =========================================================

  abs(
    value: number
  ): number {

    return Math.abs(
      Number(
        value || 0
      )
    );
  }

  formatMoney(
    value: number
  ): string {

    return Number(
      value || 0
    ).toFixed(2);
  }

  private roundMoney(
    value: number
  ): number {

    return Math.round(
      (
        value +
        Number.EPSILON
      ) * 100
    ) / 100;
  }

  private getDateFromIso(
    value: string
  ): string {

    if (!value) {
      return '';
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

      return '';
    }

    return this.toDateInput(
      date
    );
  }

  // =========================================================
  // ESTADO DE CAJA
  // =========================================================

  hasOpenShift(): boolean {

    return !!this.currentShift;
  }

  isShiftClosed(): boolean {

    return !!this.currentShift &&
      this.currentShift.status ===
      'ENTREGADO';
  }

  get cashDifference(): number {

    if (
      !this.currentShift ||
      this.currentShift.countedCash ===
      undefined
    ) {

      return 0;
    }

    return this.roundMoney(
      Number(
        this.currentShift.countedCash
      ) -
      Number(
        this.currentShift.expectedCash
      )
    );
  }

  get cashDifferenceLabel(): string {

    const difference =
      this.cashDifference;

    if (
      difference === 0
    ) {

      return 'CUADRADO';
    }

    if (
      difference > 0
    ) {

      return 'SOBRANTE';
    }

    return 'FALTANTE';
  }

  // =========================================================
  // MENSAJES
  // =========================================================

  clearMessages(): void {

    this.errorMessage = '';

    this.successMessage = '';
  }

  // =========================================================
  // IMPRIMIR CIERRE
  // =========================================================

  printCash(): void {

    const reportDate =
      this.formatLongDate(
        this.selectedDate
      );

    const cajaInicial =
      Number(
        this.initialBalance || 0
      );

    // =======================================================
    // HABITACIONES
    // =======================================================

    const habitacionesEfectivo =
      this.movements
        .filter(
          movement =>
            movement.movementType ===
            'RESERVA' &&
            movement.paymentMethod ===
            'EFECTIVO'
        )
        .reduce(
          (total, movement) =>
            total +
            Number(
              movement.amount || 0
            ),
          0
        );

    const habitacionesPLIN =
      this.movements
        .filter(
          movement =>
            movement.movementType ===
            'RESERVA' &&
            movement.paymentMethod ===
            'PLIN'
        )
        .reduce(
          (total, movement) =>
            total +
            Number(
              movement.amount || 0
            ),
          0
        );

    const totalHabitaciones =
      this.roundMoney(
        habitacionesEfectivo +
        habitacionesPLIN
      );

    // =======================================================
    // CONSUMOS CLIENTES
    // =======================================================

    const consumosEfectivo =
      this.movements
        .filter(
          movement =>
            movement.movementType ===
            'CONSUMO' &&
            movement.paymentMethod ===
            'EFECTIVO'
        )
        .reduce(
          (total, movement) =>
            total +
            Number(
              movement.amount || 0
            ),
          0
        );

    const consumosPLIN =
      this.movements
        .filter(
          movement =>
            movement.movementType ===
            'CONSUMO' &&
            movement.paymentMethod ===
            'PLIN'
        )
        .reduce(
          (total, movement) =>
            total +
            Number(
              movement.amount || 0
            ),
          0
        );

    const totalConsumosClientes =
      this.roundMoney(
        consumosEfectivo +
        consumosPLIN
      );

    // =======================================================
    // PERSONAL QUE PAGA CON SU DINERO
    // =======================================================

    const personalPagadoPorTrabajador =
      this.roundMoney(
        this.totalPersonalWorkerExpenses || 0
      );

    // =======================================================
    // INGRESOS
    // =======================================================

    const totalEfectivoIngresos =
      this.roundMoney(
        habitacionesEfectivo +
        consumosEfectivo
      );

    const totalPLINIngresos =
      this.roundMoney(
        habitacionesPLIN +
        consumosPLIN
      );

    const totalIngresosClientes =
      this.roundMoney(
        totalHabitaciones +
        totalConsumosClientes
      );

    const totalIngresos =
      this.roundMoney(
        totalIngresosClientes +
        personalPagadoPorTrabajador
      );

    // =======================================================
    // EGRESOS
    // =======================================================

    const egresoHotel =
      this.roundMoney(
        this.totalNormalExpenses || 0
      );

    const egresoPersonal =
      this.roundMoney(
        this.totalPersonalHotelExpenses || 0
      );

    const totalEgresos =
      this.roundMoney(
        egresoHotel +
        egresoPersonal
      );

    // =======================================================
    // A CUENTA
    // =======================================================

    const totalConsumoPersonalCuenta =
      this.roundMoney(
        this.totalPersonalAccountExpenses || 0
      );

    // =======================================================
    // EFECTIVO ESPERADO
    // =======================================================

    const efectivoIngresosReales =
      this.roundMoney(
        totalEfectivoIngresos +
        personalPagadoPorTrabajador
      );

    const efectivoEsperado =
      this.roundMoney(
        cajaInicial +
        efectivoIngresosReales -
        totalEgresos
      );

    // =======================================================
    // EFECTIVO ENCONTRADO
    // =======================================================

    const selectedShift =
      [...this.shifts]
        .filter(
          shift =>
            shift.status ===
            'ENTREGADO' ||
            !!shift.endedAt
        )
        .sort(
          (a, b) =>
            new Date(
              b.endedAt ||
              b.startedAt
            ).getTime() -
            new Date(
              a.endedAt ||
              a.startedAt
            ).getTime()
        )[0];

    const efectivoEncontrado =
      selectedShift &&
        selectedShift.countedCash !==
        undefined &&
        selectedShift.countedCash !==
        null
        ? Number(
          selectedShift.countedCash
        )
        : null;

    const diferencia =
      efectivoEncontrado !== null
        ? this.roundMoney(
          efectivoEncontrado -
          efectivoEsperado
        )
        : null;

    // =======================================================
    // TURNO
    // =======================================================

    const shiftForReport =
      selectedShift ||
      this.currentShift;

    let turnoTexto =
      '08:00 – 20:00';

    if (
      shiftForReport
    ) {

      const inicio =
        this.formatTime(
          shiftForReport.startedAt
        );

      const fin =
        shiftForReport.endedAt
          ? this.formatTime(
            shiftForReport.endedAt
          )
          : '20:00';

      turnoTexto =
        `${inicio} – ${fin}`;
    }

    // =======================================================
    // HELPERS
    // =======================================================

    const money =
      (value: number): string =>
        `S/ ${this.formatMoney(value)}`;

    const moneyBlank =
      (value: number | null): string =>
        value === null
          ? 'S/ ______'
          : money(value);

    const differenceLabel =
      diferencia === null
        ? '—'
        : diferencia === 0
          ? 'CUADRADO'
          : diferencia > 0
            ? 'SOBRANTE'
            : 'FALTANTE';

    // =======================================================
    // HTML
    // =======================================================

    const html = `
<!DOCTYPE html>

<html lang="es">

<head>

  <meta charset="UTF-8">

  <title>
    Cierre de Caja - ${this.selectedDate}
  </title>

  <style>

    @page {
      size: A4;
      margin: 18mm;
    }

    * {
      box-sizing: border-box;
    }

    body {
      font-family:
        Arial,
        Helvetica,
        sans-serif;

      margin: 0;

      color: #202938;

      background: white;

      font-size: 11px;

      line-height: 1.35;
    }

    .document {
      max-width: 760px;
      margin: 0 auto;
    }

    .header {
      text-align: center;
      padding-bottom: 16px;
      border-bottom:
        2px solid #1f3c88;
      margin-bottom: 18px;
    }

    .hotel {
      font-size: 11px;
      font-weight: bold;
      letter-spacing: .18em;
      color: #1f3c88;
      text-transform: uppercase;
      margin-bottom: 5px;
    }

    h1 {
      margin: 0;
      font-size: 23px;
      color: #182235;
      text-transform: uppercase;
    }

    .turno {
      margin-top: 7px;
      font-size: 11px;
      font-weight: bold;
      color: #4e596b;
    }

    .fecha {
      margin-top: 3px;
      font-size: 10px;
      color: #6d7686;
      text-transform: capitalize;
    }

    .opening {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 12px;
      margin-bottom: 18px;
      border:
        1px solid #d8dee8;
      border-radius: 5px;
      background: #fafbfd;
    }

    .opening-label {
      font-weight: bold;
      color: #4e596b;
      text-transform: uppercase;
      letter-spacing: .05em;
    }

    .opening-value {
      font-size: 15px;
      font-weight: bold;
      color: #182235;
    }

    h2 {
      margin:
        0 0 9px;
      font-size: 13px;
      color: #182235;
      text-transform: uppercase;
      letter-spacing: .04em;
    }

    table {
      width: 100%;
      border-collapse:
        collapse;
      border:
        1px solid #d8dee8;
      margin-bottom: 17px;
    }

    th {
      background:
        #1f3c88;
      color: white;
      padding:
        9px 10px;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: .05em;
    }

    td {
      padding:
        10px;
      border-bottom:
        1px solid #e3e7ed;
      font-size: 10.5px;
    }

    tr:last-child td {
      border-bottom:
        none;
    }

    th:first-child,
    td:first-child {
      text-align: left;
    }

    th:not(:first-child),
    td:not(:first-child) {
      text-align: right;
    }

    .row-total td {
      font-weight: bold;
      border-top:
        2px solid #1f3c88;
      background: #fafbfd;
      font-size: 11px;
    }

    .totals {
      border-top:
        1px solid #d8dee8;
      margin-top: 4px;
      padding-top: 5px;
    }

    .total-line {
      display: flex;
      justify-content: space-between;
      padding:
        6px 0;
      font-size: 11px;
    }

    .total-line strong {
      font-size: 11px;
    }

    .total-line.main {
      margin-top: 3px;
      padding:
        9px 0;
      border-top:
        2px solid #1f3c88;
      font-size: 13px;
    }

    .total-line.main strong {
      font-size: 14px;
    }

    .cash-control {
      margin-top: 20px;
      border:
        1px solid #d8dee8;
      border-radius: 5px;
      overflow: hidden;
    }

    .cash-control-title {
      padding:
        9px 11px;
      background:
        #f2f5f9;
      font-size: 10px;
      font-weight: bold;
      color: #182235;
      text-transform: uppercase;
      letter-spacing: .05em;
    }

    .cash-line {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding:
        9px 11px;
      border-top:
        1px solid #e2e6ec;
    }

    .cash-line-label {
      color: #4e596b;
    }

    .cash-line-value {
      font-weight: bold;
      color: #182235;
    }

    .expected {
      background:
        #fafbfd;
    }

    .found {
      font-size: 12px;
    }

    .difference {
      border-top:
        2px solid #1f3c88;
      font-size: 12px;
      font-weight: bold;
    }

    .difference-value {
      font-size: 13px;
    }

    .personal {
      margin-top: 16px;
      padding:
        11px;
      border:
        1px solid #d8dee8;
      border-radius: 5px;
    }

    .personal-title {
      font-size: 10px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: .05em;
      color: #182235;
      margin-bottom: 8px;
    }

    .personal-description {
      color: #4e596b;
      font-size: 10px;
      margin-bottom: 8px;
    }

    .personal-line {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .personal-label {
      color: #4e596b;
      font-weight: bold;
    }

    .personal-value {
      font-weight: bold;
      color: #182235;
    }

    .signatures {
      display: grid;
      grid-template-columns:
        1fr 1fr;
      gap: 80px;
      margin-top: 55px;
    }

    .signature {
      border-top:
        1px solid #555;
      padding-top: 7px;
      text-align: center;
      font-size: 9px;
      color: #4f5969;
    }

    .footer {
      margin-top: 25px;
      padding-top: 8px;
      border-top:
        1px solid #e0e4ea;
      text-align: center;
      font-size: 8px;
      color: #89919f;
    }

    @media print {

      body {
        -webkit-print-color-adjust:
          exact;

        print-color-adjust:
          exact;
      }

      .cash-control,
      .opening,
      .personal,
      table {
        page-break-inside:
          avoid;
      }

    }

  </style>

</head>

<body>

  <div class="document">

    <div class="header">

      <div class="hotel">
        HOTEL GIRASOLES
      </div>

      <h1>
        Cierre de Caja
      </h1>

      <div class="turno">
        Turno ${this.escapeHtml(turnoTexto)}
      </div>

      <div class="fecha">
        ${this.escapeHtml(reportDate)}
      </div>

    </div>

    <div class="opening">

      <span class="opening-label">
        Caja inicial
      </span>

      <strong class="opening-value">
        ${money(cajaInicial)}
      </strong>

    </div>

    <h2>
      Ingresos del turno
    </h2>

    <table>

      <thead>

        <tr>

          <th>
            Concepto
          </th>

          <th>
            Efectivo
          </th>

          <th>
            PLIN/YAPE
          </th>

        </tr>

      </thead>

      <tbody>

        <tr>

          <td>
            Habitaciones
          </td>

          <td>
            ${money(habitacionesEfectivo)}
          </td>

          <td>
            ${money(habitacionesPLIN)}
          </td>

        </tr>

        <tr>

          <td>
            Consumos de clientes
          </td>

          <td>
            ${money(consumosEfectivo)}
          </td>

          <td>
            ${money(consumosPLIN)}
          </td>

        </tr>

        <tr>

          <td>
            Personal pagado con dinero propio
          </td>

          <td>
            ${money(personalPagadoPorTrabajador)}
          </td>

          <td>
            ${money(0)}
          </td>

        </tr>

        <tr class="row-total">

          <td>
            TOTAL
          </td>

          <td>
            ${money(
      this.roundMoney(
        totalEfectivoIngresos +
        personalPagadoPorTrabajador
      )
    )}
          </td>

          <td>
            ${money(totalPLINIngresos)}
          </td>

        </tr>

      </tbody>

    </table>

    <div class="totals">

      <div class="total-line">

        <span>
          Ingresos de habitaciones
        </span>

        <strong>
          ${money(totalHabitaciones)}
        </strong>

      </div>

      <div class="total-line">

        <span>
          Consumos de clientes
        </span>

        <strong>
          ${money(totalConsumosClientes)}
        </strong>

      </div>

      <div class="total-line">

        <span>
          Ingreso de personal
        </span>

        <strong>
          ${money(personalPagadoPorTrabajador)}
        </strong>

      </div>

      <div class="total-line main">

        <span>
          INGRESOS TOTALES
        </span>

        <strong>
          ${money(totalIngresos)}
        </strong>

      </div>

    </div>

    <h2 style="margin-top: 20px;">
      Egresos de caja
    </h2>

    <table>

      <tbody>

        <tr>

          <td>
            Egreso del hotel
          </td>

          <td>
            ${money(egresoHotel)}
          </td>

        </tr>

        <tr>

          <td>
            Egreso de personal
          </td>

          <td>
            ${money(egresoPersonal)}
          </td>

        </tr>

        <tr class="row-total">

          <td>
            TOTAL EGRESOS
          </td>

          <td>
            ${money(totalEgresos)}
          </td>

        </tr>

      </tbody>

    </table>

    <div class="personal">

      <div class="personal-title">
        Consumo de personal — A cuenta
      </div>

      <div class="personal-description">
        Productos consumidos de bodega pendientes de pago.
      </div>

      <div class="personal-line">

        <span class="personal-label">
          Total a cuenta
        </span>

        <strong class="personal-value">
          ${money(totalConsumoPersonalCuenta)}
        </strong>

      </div>

      <div
        class="personal-description"
        style="margin-top: 7px; margin-bottom: 0;"
      >
        * Este monto no afecta la Caja.<br>
        * El stock sí fue descontado.
      </div>

    </div>

    <div class="cash-control">

      <div class="cash-control-title">
        Control de efectivo
      </div>

      <div class="cash-line">

        <span class="cash-line-label">
          Caja inicial
        </span>

        <strong class="cash-line-value">
          ${money(cajaInicial)}
        </strong>

      </div>

      <div class="cash-line">

        <span class="cash-line-label">
          Ingresos en efectivo
        </span>

        <strong class="cash-line-value">
          ${money(efectivoIngresosReales)}
        </strong>

      </div>

      <div class="cash-line">

        <span class="cash-line-label">
          Egresos de caja
        </span>

        <strong class="cash-line-value">
          -${money(totalEgresos)}
        </strong>

      </div>

      <div class="cash-line expected">

        <span class="cash-line-label">
          Efectivo esperado en caja
        </span>

        <strong class="cash-line-value">
          ${money(efectivoEsperado)}
        </strong>

      </div>

      <div class="cash-line found">

        <span class="cash-line-label">
          Efectivo encontrado
        </span>

        <strong class="cash-line-value">
          ${moneyBlank(efectivoEncontrado)}
        </strong>

      </div>

      <div class="cash-line difference">

        <span>
          Diferencia
        </span>

        <strong class="difference-value">

          ${diferencia === null
        ? 'S/ ______'
        : `${money(diferencia)} · ${differenceLabel}`
      }

        </strong>

      </div>

    </div>

    <div class="signatures">

      <div class="signature">
        Responsable que entrega
      </div>

      <div class="signature">
        Responsable que recibe
      </div>

    </div>

    <div class="footer">

      Hotel Girasoles · Cierre generado el

      ${this.escapeHtml(
        new Date().toLocaleString(
          'es-PE'
        )
      )}

    </div>

  </div>

  <script>

    window.addEventListener(
      'afterprint',
      function() {
        window.close();
      }
    );

  </script>

</body>

</html>
`;

    const reportWindow =
      window.open(
        '',
        '_blank',
        'width=1000,height=800'
      );

    if (!reportWindow) {

      this.errorMessage =
        'El navegador bloqueó la ventana del reporte. Permite ventanas emergentes para este sitio.';

      return;
    }

    reportWindow.document.open();

    reportWindow.document.write(
      html
    );

    reportWindow.document.close();
  }

  // =========================================================
  // ESCAPAR HTML
  // =========================================================

  private escapeHtml(
    value: string
  ): string {

    return String(
      value ?? ''
    )
      .replace(
        /&/g,
        '&amp;'
      )
      .replace(
        /</g,
        '&lt;'
      )
      .replace(
        />/g,
        '&gt;'
      )
      .replace(
        /"/g,
        '&quot;'
      )
      .replace(
        /'/g,
        '&#039;'
      );
  }
}