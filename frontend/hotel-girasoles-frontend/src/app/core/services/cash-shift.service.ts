import { Injectable } from '@angular/core';


// =============================================================
// TIPOS DE GASTOS
// =============================================================

export type CashExpenseType =
    | 'NORMAL'
    | 'PERSONAL';


export type CashExpensePaidBy =
    | 'HOTEL'
    | 'TRABAJADOR';


export type CashExpenseCashEffect =
    | 'EGRESO'
    | 'INGRESO'
    | 'NINGUNO';


export type PersonalExpenseStatus =
    | 'PAGADO'
    | 'A_CUENTA';


// =============================================================
// MODELOS
// =============================================================

export interface CashShift {

    id: string;

    date: string;

    personName: string;

    startedAt: string;

    endedAt?: string;

    openingBalance: number;

    expectedCash: number;

    countedCash?: number;

    difference?: number;

    status:
    | 'ABIERTO'
    | 'ENTREGADO';
}


export interface CashExpense {

    id: string;

    date: string;

    amount: number;

    description: string;

    createdAt: string;

    // NORMAL = egreso del hotel
    // PERSONAL = movimiento relacionado con personal
    type: CashExpenseType;

    // HOTEL = dinero sale de Caja
    // TRABAJADOR = trabajador paga con su dinero
    paidBy: CashExpensePaidBy;

    // EGRESO = dinero sale de Caja
    // INGRESO = dinero entra a Caja
    // NINGUNO = no hay movimiento de Caja
    cashEffect: CashExpenseCashEffect;

    // PAGADO = consumo personal pagado
    // A_CUENTA = consumo personal pendiente
    personalStatus?: PersonalExpenseStatus;

    // Si el movimiento personal corresponde
    // a un producto tomado de bodega.
    productId?: number;

    productName?: string;

    quantity?: number;
}


export interface OpenCashData {

    personName: string;

    openingBalance: number;
}


export interface NewCashExpense {

    date: string;

    amount: number;

    description: string;

    type?: CashExpenseType;

    paidBy?: CashExpensePaidBy;

    cashEffect?: CashExpenseCashEffect;

    personalStatus?: PersonalExpenseStatus;

    productId?: number;

    productName?: string;

    quantity?: number;
}


// =============================================================
// SERVICIO
// =============================================================

@Injectable({
    providedIn: 'root'
})
export class CashShiftService {


    // =========================================================
    // STORAGE
    // =========================================================

    private readonly shiftsStorageKey =
        'hotelgr_cash_shifts';

    private readonly expensesStorageKey =
        'hotelgr_cash_expenses';


    // =========================================================
    // TURNOS
    // =========================================================

    getAllShifts(): CashShift[] {

        const raw =
            localStorage.getItem(
                this.shiftsStorageKey
            );


        if (!raw) {

            return [];
        }


        try {

            const parsed =
                JSON.parse(raw);


            if (!Array.isArray(parsed)) {

                return [];
            }


            return parsed as CashShift[];

        } catch {

            return [];
        }
    }


    saveShifts(
        shifts: CashShift[]
    ): void {

        localStorage.setItem(
            this.shiftsStorageKey,
            JSON.stringify(shifts)
        );
    }


    getShiftsByDate(
        date: string
    ): CashShift[] {

        return this.getAllShifts()
            .filter(
                shift =>
                    shift.date ===
                    date
            )
            .sort(
                (a, b) =>
                    new Date(a.startedAt).getTime() -
                    new Date(b.startedAt).getTime()
            );
    }


    // =========================================================
    // CAJA ABIERTA
    // =========================================================

    getOpenShift(
        date?: string
    ): CashShift | null {

        const shifts =
            this.getAllShifts();


        const openShift =
            shifts.find(
                shift =>
                    shift.status === 'ABIERTO' &&
                    (
                        !date ||
                        shift.date === date
                    )
            );


        return openShift ?? null;
    }


    // =========================================================
    // ÚLTIMO TURNO
    // =========================================================

    getLastShift(
        date: string
    ): CashShift | null {

        const shifts =
            this.getShiftsByDate(
                date
            );


        if (
            shifts.length === 0
        ) {

            return null;
        }


        return shifts[
            shifts.length - 1
        ];
    }


    // =========================================================
    // ÚLTIMO TURNO ENTREGADO
    // =========================================================

    getLastDeliveredShift(
        date: string
    ): CashShift | null {

        const shifts =
            this.getShiftsByDate(
                date
            );


        const delivered =
            [...shifts]
                .reverse()
                .find(
                    shift =>
                        shift.status ===
                        'ENTREGADO'
                );


        return delivered ?? null;
    }


    // =========================================================
    // ÚLTIMO MONTO ENTREGADO
    // =========================================================

    getLastHandoffAmount(
        date: string
    ): number {

        const delivered =
            this.getLastDeliveredShift(
                date
            );


        return this.roundMoney(
            Number(
                delivered?.countedCash ?? 0
            )
        );
    }


    // =========================================================
    // ABRIR CAJA
    // =========================================================

    openShift(
        data: OpenCashData,
        date?: string
    ): CashShift {

        const current =
            this.getOpenShift();


        if (current) {

            throw new Error(
                `Ya existe una caja abierta. ` +
                `La está manejando ${current.personName}.`
            );
        }


        const personName =
            String(
                data?.personName ?? ''
            ).trim();


        if (!personName) {

            throw new Error(
                'Debes ingresar el nombre de la persona que recibe la caja.'
            );
        }


        const openingBalance =
            this.roundMoney(
                Number(
                    data?.openingBalance ?? 0
                )
            );


        if (
            openingBalance < 0
        ) {

            throw new Error(
                'El monto inicial no puede ser negativo.'
            );
        }


        const now =
            new Date();


        const shift: CashShift = {

            id:
                `SHIFT-${now.getTime()}-${Math.random()
                    .toString(36)
                    .substring(2, 8)}`,

            date:
                date ||
                this.getTodayKey(),

            personName,

            startedAt:
                now.toISOString(),

            openingBalance,

            expectedCash:
                openingBalance,

            status:
                'ABIERTO'
        };


        const shifts =
            this.getAllShifts();


        shifts.push(
            shift
        );


        this.saveShifts(
            shifts
        );


        return shift;
    }


    // =========================================================
    // ACTUALIZAR EFECTIVO ESPERADO
    // =========================================================

    updateExpectedCash(
        shiftId: string,
        expectedCash: number
    ): CashShift | null {

        const shifts =
            this.getAllShifts();


        const index =
            shifts.findIndex(
                shift =>
                    shift.id ===
                    shiftId
            );


        if (
            index === -1
        ) {

            return null;
        }


        shifts[index].expectedCash =
            this.roundMoney(
                Number(
                    expectedCash ?? 0
                )
            );


        this.saveShifts(
            shifts
        );


        return shifts[index];
    }


    // =========================================================
    // ENTREGAR CAJA
    // =========================================================

    handoff(
        shiftId: string,
        countedCash: number
    ): CashShift | null {

        const shifts =
            this.getAllShifts();


        const index =
            shifts.findIndex(
                shift =>
                    shift.id ===
                    shiftId
            );


        if (
            index === -1
        ) {

            return null;
        }


        const shift =
            shifts[index];


        if (
            shift.status ===
            'ENTREGADO'
        ) {

            return shift;
        }


        const counted =
            this.roundMoney(
                Number(
                    countedCash ?? 0
                )
            );


        const expected =
            this.roundMoney(
                Number(
                    shift.expectedCash ?? 0
                )
            );


        shift.countedCash =
            counted;


        shift.difference =
            this.roundMoney(
                counted -
                expected
            );


        shift.endedAt =
            new Date().toISOString();


        shift.status =
            'ENTREGADO';


        this.saveShifts(
            shifts
        );


        return shift;
    }


    // =========================================================
    // TODOS LOS MOVIMIENTOS
    // =========================================================

    getAllExpenses(): CashExpense[] {

        const raw =
            localStorage.getItem(
                this.expensesStorageKey
            );


        if (!raw) {

            return [];
        }


        try {

            const parsed =
                JSON.parse(raw);


            if (!Array.isArray(parsed)) {

                return [];
            }


            /*
             * COMPATIBILIDAD
             *
             * Los movimientos antiguos pueden no tener:
             * cashEffect
             * personalStatus
             *
             * Se mantienen compatibles sin cambiar
             * su comportamiento histórico.
             */
            return parsed.map(
                (
                    expense:
                        Partial<CashExpense>
                ) => {

                    const type:
                        CashExpenseType =
                        expense.type ??
                        'NORMAL';


                    const paidBy:
                        CashExpensePaidBy =
                        expense.paidBy ??
                        'HOTEL';


                    let cashEffect:
                        CashExpenseCashEffect;


                    if (
                        expense.cashEffect
                    ) {

                        cashEffect =
                            expense.cashEffect;

                    } else if (
                        type === 'NORMAL'
                    ) {

                        cashEffect =
                            'EGRESO';

                    } else if (
                        expense.personalStatus ===
                        'A_CUENTA'
                    ) {

                        cashEffect =
                            'NINGUNO';

                    } else if (
                        paidBy === 'TRABAJADOR'
                    ) {

                        /*
                         * Movimiento personal antiguo
                         * pagado por trabajador.
                         *
                         * Con la lógica actual,
                         * si el trabajador paga,
                         * el dinero entra a Caja.
                         */
                        cashEffect =
                            'INGRESO';

                    } else {

                        cashEffect =
                            'EGRESO';
                    }


                    return {

                        ...expense,

                        type,

                        paidBy,

                        cashEffect,

                        personalStatus:
                            expense.personalStatus

                    } as CashExpense;
                }
            );

        } catch {

            return [];
        }
    }


    // =========================================================
    // MOVIMIENTOS POR FECHA
    // =========================================================

    getExpensesByDate(
        date: string
    ): CashExpense[] {

        return this.getAllExpenses()
            .filter(
                expense =>
                    expense.date ===
                    date
            )
            .sort(
                (a, b) =>
                    new Date(
                        a.createdAt
                    ).getTime() -
                    new Date(
                        b.createdAt
                    ).getTime()
            );
    }


    // =========================================================
    // EGRESOS DEL HOTEL
    // =========================================================

    getNormalExpensesByDate(
        date: string
    ): CashExpense[] {

        return this.getExpensesByDate(
            date
        ).filter(
            expense =>
                expense.type ===
                'NORMAL'
        );
    }


    // =========================================================
    // MOVIMIENTOS DEL PERSONAL
    // =========================================================

    getPersonalExpensesByDate(
        date: string
    ): CashExpense[] {

        return this.getExpensesByDate(
            date
        ).filter(
            expense =>
                expense.type ===
                'PERSONAL'
        );
    }


    // =========================================================
    // EGRESOS DE PERSONAL
    // =========================================================

    getPersonalHotelExpensesByDate(
        date: string
    ): CashExpense[] {

        return this.getPersonalExpensesByDate(
            date
        ).filter(
            expense =>
                expense.cashEffect ===
                'EGRESO'
        );
    }


    // =========================================================
    // PRODUCTOS PAGADOS POR EL TRABAJADOR
    // =========================================================

    getPersonalWorkerExpensesByDate(
        date: string
    ): CashExpense[] {

        return this.getPersonalExpensesByDate(
            date
        ).filter(
            expense =>
                expense.cashEffect ===
                'INGRESO'
        );
    }


    // =========================================================
    // PERSONAL A CUENTA
    // =========================================================

    getPersonalAccountExpensesByDate(
        date: string
    ): CashExpense[] {

        return this.getPersonalExpensesByDate(
            date
        ).filter(
            expense =>
                expense.personalStatus ===
                'A_CUENTA'
        );
    }


    // =========================================================
    // PERSONAL PAGADO
    // =========================================================

    getPersonalPaidExpensesByDate(
        date: string
    ): CashExpense[] {

        return this.getPersonalExpensesByDate(
            date
        ).filter(
            expense =>
                expense.personalStatus !==
                'A_CUENTA'
        );
    }


    // =========================================================
    // TOTAL PERSONAL A CUENTA
    // =========================================================

    getTotalPersonalAccountExpenses(
        date: string
    ): number {

        return this.getPersonalAccountExpensesByDate(
            date
        )
            .reduce(
                (
                    total,
                    expense
                ) =>
                    total +
                    Number(
                        expense.amount ?? 0
                    ),
                0
            );
    }


    // =========================================================
    // EGRESOS DE PERSONAL QUE SALIERON DE CAJA
    // =========================================================

    getPersonalCashExpensesByDate(
        date: string
    ): CashExpense[] {

        return this.getPersonalExpensesByDate(
            date
        ).filter(
            expense =>
                expense.cashEffect ===
                'EGRESO'
        );
    }


    // =========================================================
    // INGRESOS DE PERSONAL QUE ENTRARON A CAJA
    // =========================================================

    getPersonalCashIncomeByDate(
        date: string
    ): CashExpense[] {

        return this.getPersonalExpensesByDate(
            date
        ).filter(
            expense =>
                expense.cashEffect ===
                'INGRESO'
        );
    }


    // =========================================================
    // TOTAL DE MOVIMIENTOS DEL PERSONAL
    // =========================================================

    getTotalPersonalExpenses(
        date: string
    ): number {

        return this.getPersonalExpensesByDate(
            date
        )
            .reduce(
                (
                    total,
                    expense
                ) =>
                    total +
                    Number(
                        expense.amount ?? 0
                    ),
                0
            );
    }


    // =========================================================
    // TOTAL EGRESO DE PERSONAL
    // =========================================================

    getTotalPersonalHotelExpenses(
        date: string
    ): number {

        return this.getPersonalCashExpensesByDate(
            date
        )
            .reduce(
                (
                    total,
                    expense
                ) =>
                    total +
                    Number(
                        expense.amount ?? 0
                    ),
                0
            );
    }


    // =========================================================
    // TOTAL INGRESO DE PERSONAL
    // =========================================================

    getTotalPersonalCashIncome(
        date: string
    ): number {

        return this.getPersonalCashIncomeByDate(
            date
        )
            .reduce(
                (
                    total,
                    expense
                ) =>
                    total +
                    Number(
                        expense.amount ?? 0
                    ),
                0
            );
    }


    // =========================================================
    // EGRESOS QUE AFECTAN CAJA
    // =========================================================

    getCashExpensesByDate(
        date: string
    ): CashExpense[] {

        return this.getExpensesByDate(
            date
        ).filter(
            expense =>
                expense.cashEffect ===
                'EGRESO'
        );
    }


    // =========================================================
    // INGRESOS QUE AFECTAN CAJA
    // =========================================================

    getCashIncomeByDate(
        date: string
    ): CashExpense[] {

        return this.getExpensesByDate(
            date
        ).filter(
            expense =>
                expense.cashEffect ===
                'INGRESO'
        );
    }


    // =========================================================
    // TOTAL DE EGRESOS DE CAJA
    // =========================================================

    getTotalCashExpenses(
        date: string
    ): number {

        return this.getCashExpensesByDate(
            date
        )
            .reduce(
                (
                    total,
                    expense
                ) =>
                    total +
                    Number(
                        expense.amount ?? 0
                    ),
                0
            );
    }


    // =========================================================
    // TOTAL DE INGRESOS DE CAJA
    // =========================================================

    getTotalCashIncome(
        date: string
    ): number {

        return this.getCashIncomeByDate(
            date
        )
            .reduce(
                (
                    total,
                    expense
                ) =>
                    total +
                    Number(
                        expense.amount ?? 0
                    ),
                0
            );
    }


    // =========================================================
    // AGREGAR MOVIMIENTO
    //
    // REGLAS DEFINITIVAS:
    //
    // 1. NORMAL
    //    - Es gasto del hotel.
    //    - Dinero sale de Caja.
    //
    // 2. PERSONAL + PRODUCTO + TRABAJADOR + PAGADO
    //    - El trabajador paga con su propio dinero.
    //    - Stock disminuye.
    //    - Dinero entra a Caja.
    //
    // 3. PERSONAL + PRODUCTO + A_CUENTA
    //    - Stock disminuye.
    //    - No entra dinero.
    //    - No sale dinero.
    //
    // 4. PERSONAL + SIN PRODUCTO + HOTEL
    //    - Es dinero que personal toma directamente
    //      de Caja.
    //    - Caja disminuye.
    //
    // 5. PERSONAL + PRODUCTO + HOTEL
    //    - NO está permitido.
    //    - El hotel no paga el producto de bodega
    //      para el trabajador.
    // =========================================================

    addExpense(
        data: NewCashExpense
    ): CashExpense;


    addExpense(
        date: string,
        amount: number,
        description: string
    ): CashExpense;


    addExpense(
        dataOrDate: NewCashExpense | string,
        amount?: number,
        description?: string
    ): CashExpense {

        let date: string;

        let numericAmount: number;

        let cleanDescription: string;

        let expenseType:
            CashExpenseType =
            'NORMAL';

        let paidBy:
            CashExpensePaidBy =
            'HOTEL';

        let cashEffect:
            CashExpenseCashEffect;

        let personalStatus:
            PersonalExpenseStatus |
            undefined;

        let productId:
            number | undefined;

        let productName:
            string | undefined;

        let quantity:
            number | undefined;


        // =====================================================
        // FORMA NUEVA
        // =====================================================

        if (
            typeof dataOrDate ===
            'object'
        ) {

            date =
                dataOrDate.date ||
                this.getTodayKey();


            numericAmount =
                this.roundMoney(
                    Number(
                        dataOrDate.amount ??
                        0
                    )
                );


            cleanDescription =
                String(
                    dataOrDate.description ??
                    ''
                ).trim();


            expenseType =
                dataOrDate.type ??
                'NORMAL';


            paidBy =
                dataOrDate.paidBy ??
                'HOTEL';


            productId =
                dataOrDate.productId;


            productName =
                dataOrDate.productName;


            quantity =
                dataOrDate.quantity;


            personalStatus =
                dataOrDate.personalStatus;


            cashEffect =
                dataOrDate.cashEffect ??
                'NINGUNO';

        }

        // =====================================================
        // FORMA ANTIGUA
        // =====================================================

        else {

            date =
                dataOrDate ||
                this.getTodayKey();


            numericAmount =
                this.roundMoney(
                    Number(
                        amount ??
                        0
                    )
                );


            cleanDescription =
                String(
                    description ??
                    ''
                ).trim();


            expenseType =
                'NORMAL';


            paidBy =
                'HOTEL';


            cashEffect =
                'EGRESO';
        }


        // =====================================================
        // VALIDACIONES BÁSICAS
        // =====================================================

        if (
            numericAmount <= 0
        ) {

            throw new Error(
                'El monto del movimiento debe ser mayor a cero.'
            );
        }


        if (
            !cleanDescription
        ) {

            throw new Error(
                'Debes ingresar la descripción del movimiento.'
            );
        }


        if (
            expenseType !== 'NORMAL' &&
            expenseType !== 'PERSONAL'
        ) {

            throw new Error(
                'El tipo de movimiento no es válido.'
            );
        }


        if (
            paidBy !== 'HOTEL' &&
            paidBy !== 'TRABAJADOR'
        ) {

            throw new Error(
                'La forma de pago del movimiento no es válida.'
            );
        }


        if (
            cashEffect !== 'EGRESO' &&
            cashEffect !== 'INGRESO' &&
            cashEffect !== 'NINGUNO'
        ) {

            throw new Error(
                'El movimiento de Caja no es válido.'
            );
        }


        // =====================================================
        // VALIDACIÓN ESTADO PERSONAL
        // =====================================================

        if (
            personalStatus !== undefined &&
            personalStatus !== 'PAGADO' &&
            personalStatus !== 'A_CUENTA'
        ) {

            throw new Error(
                'El estado del consumo personal no es válido.'
            );
        }


        // =====================================================
        // REGLAS PARA EGRESOS DEL HOTEL
        // =====================================================

        if (
            expenseType ===
            'NORMAL'
        ) {

            /*
             * NORMAL siempre es un egreso del hotel.
             */
            paidBy =
                'HOTEL';

            cashEffect =
                'EGRESO';

            personalStatus =
                undefined;
        }


        // =====================================================
        // REGLAS PARA PERSONAL
        // =====================================================

        if (
            expenseType ===
            'PERSONAL'
        ) {

            const hasProduct =
                productId !== undefined;


            // -------------------------------------------------
            // VALIDAR PRODUCTO
            // -------------------------------------------------

            if (
                hasProduct &&
                (
                    !Number.isFinite(
                        productId
                    ) ||
                    Number(productId) <= 0
                )
            ) {

                throw new Error(
                    'El producto seleccionado no es válido.'
                );
            }


            if (
                hasProduct &&
                !productName
            ) {

                throw new Error(
                    'Debes indicar el nombre del producto.'
                );
            }


            if (
                hasProduct &&
                (
                    quantity === undefined ||
                    !Number.isFinite(
                        Number(quantity)
                    ) ||
                    Number(quantity) <= 0
                )
            ) {

                throw new Error(
                    'La cantidad del producto debe ser mayor a cero.'
                );
            }


            // -------------------------------------------------
            // PRODUCTO DE BODEGA
            // -------------------------------------------------

            if (
                hasProduct
            ) {

                /*
                 * Un producto de bodega para personal
                 * solamente puede:
                 *
                 * 1. Ser pagado por el trabajador.
                 * 2. Quedar a cuenta.
                 *
                 * Nunca puede pagarlo el hotel.
                 */

                if (
                    paidBy ===
                    'HOTEL'
                ) {

                    throw new Error(
                        'Un producto de bodega para personal no puede pagarse con dinero de Caja. El trabajador debe pagarlo con su dinero o dejarlo a cuenta.'
                    );
                }


                // ---------------------------------------------
                // PRODUCTO A CUENTA
                // ---------------------------------------------

                if (
                    personalStatus ===
                    'A_CUENTA'
                ) {

                    paidBy =
                        'TRABAJADOR';

                    cashEffect =
                        'NINGUNO';

                }

                // ---------------------------------------------
                // PRODUCTO PAGADO
                // ---------------------------------------------

                else {

                    personalStatus =
                        'PAGADO';

                    paidBy =
                        'TRABAJADOR';

                    cashEffect =
                        'INGRESO';
                }

            }

            // -------------------------------------------------
            // SIN PRODUCTO = DINERO DE CAJA
            // -------------------------------------------------

            else {

                /*
                 * Si no hay producto, estamos registrando
                 * dinero que el personal toma directamente
                 * de Caja.
                 *
                 * Ejemplo:
                 * - pasaje
                 * - almuerzo
                 * - movilidad
                 * - urgencia
                 *
                 * Esto SIEMPRE reduce Caja.
                 */

                if (
                    personalStatus ===
                    'A_CUENTA'
                ) {

                    throw new Error(
                        'A cuenta solamente puede utilizarse para productos de bodega.'
                    );
                }


                paidBy =
                    'HOTEL';

                personalStatus =
                    'PAGADO';

                cashEffect =
                    'EGRESO';
            }
        }


        // =====================================================
        // CREAR MOVIMIENTO
        // =====================================================

        const now =
            new Date();


        const expense: CashExpense = {

            id:
                `EXP-${now.getTime()}-${Math.random()
                    .toString(36)
                    .substring(2, 8)}`,

            date,

            amount:
                numericAmount,

            description:
                cleanDescription,

            createdAt:
                now.toISOString(),

            type:
                expenseType,

            paidBy:
                paidBy,

            cashEffect:
                cashEffect,

            personalStatus:
                personalStatus,

            productId:
                productId,

            productName:
                productName,

            quantity:
                quantity
        };


        const expenses =
            this.getAllExpenses();


        expenses.push(
            expense
        );


        localStorage.setItem(
            this.expensesStorageKey,
            JSON.stringify(
                expenses
            )
        );


        return expense;
    }


    // =========================================================
    // ELIMINAR MOVIMIENTO
    // =========================================================

    deleteExpense(
        expenseId: string
    ): boolean {

        const expenses =
            this.getAllExpenses();


        const filtered =
            expenses.filter(
                expense =>
                    expense.id !==
                    expenseId
            );


        if (
            filtered.length ===
            expenses.length
        ) {

            return false;
        }


        localStorage.setItem(
            this.expensesStorageKey,
            JSON.stringify(
                filtered
            )
        );


        return true;
    }


    // =========================================================
    // OBTENER MOVIMIENTO
    // =========================================================

    getExpenseById(
        expenseId: string
    ): CashExpense | null {

        const expense =
            this.getAllExpenses()
                .find(
                    item =>
                        item.id ===
                        expenseId
                );


        return expense ?? null;
    }


    // =========================================================
    // FECHA ACTUAL
    // =========================================================

    getTodayKey(): string {

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


    // =========================================================
    // FORMATEAR FECHA
    // =========================================================

    getDateKey(
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
    // REDONDEAR DINERO
    // =========================================================

    roundMoney(
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
    // FORMATO MONEDA
    // =========================================================

    formatMoney(
        value: number
    ): string {

        return this.roundMoney(
            value
        ).toFixed(2);
    }
}