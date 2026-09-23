
import {
  ChangeDetectorRef,
  Component,
  OnInit,
  inject
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize, forkJoin } from 'rxjs';

import {
  CashExpense,
  CashExpenseCashEffect,
  CashExpensePaidBy,
  CashShiftService,
  PersonalExpenseStatus
} from '../../core/services/cash-shift.service';

import { ProductService } from '../../core/services/product.service';
import { Product } from '../../core/models/hotel.models';

type ExpenseMode = 'PRODUCT' | 'CASH' | '';

type PersonalProductPayment =
  | 'TRABAJADOR'
  | 'A_CUENTA';

interface PersonalProductItem {
  product: Product;
  quantity: number;
  amount: number;
}

@Component({
  selector: 'app-personal-expenses',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './personal-expenses.html',
  styleUrl: './personal-expenses.css'
})
export class PersonalExpensesComponent implements OnInit {

  private readonly cashShiftService =
    inject(CashShiftService);

  private readonly productService =
    inject(ProductService);

  private readonly cdr =
    inject(ChangeDetectorRef);


  // =========================================================
  // DATOS
  // =========================================================

  selectedDate =
    this.cashShiftService.getTodayKey();

  expenses: CashExpense[] = [];

  products: Product[] = [];


  // =========================================================
  // FORMULARIO
  // =========================================================

  workerName = '';

  description = '';

  expenseMode: ExpenseMode = '';

  selectedProductId: number | null = null;

  quantity = 1;

  cashAmount = 0;

  paidBy: CashExpensePaidBy = 'HOTEL';

  personalProductPayment: PersonalProductPayment =
    'TRABAJADOR';

  total = 0;


  // =========================================================
  // PRODUCTOS AGREGADOS
  // =========================================================

  addedProducts: PersonalProductItem[] = [];


  // =========================================================
  // ESTADOS
  // =========================================================

  loading = false;

  saving = false;

  errorMessage = '';

  successMessage = '';


  // =========================================================
  // INICIO
  // =========================================================

  ngOnInit(): void {

    this.loadProducts();

    this.loadExpenses();

  }


  // =========================================================
  // PRODUCTOS
  // =========================================================

  loadProducts(): void {

    this.loading = true;

    this.productService
      .getAll()
      .subscribe({

        next: products => {

          this.products =
            products ?? [];

          this.loading = false;

          this.calculateTotal();

          this.cdr.detectChanges();

        },

        error: () => {

          this.products = [];

          this.loading = false;

          this.errorMessage =
            'No se pudieron cargar los productos.';

          this.cdr.detectChanges();

        }

      });

  }


  // =========================================================
  // GASTOS
  // =========================================================

  loadExpenses(): void {

    this.expenses =
      this.cashShiftService
        .getPersonalExpensesByDate(
          this.selectedDate
        );

  }


  // =========================================================
  // CAMBIOS DEL FORMULARIO
  // =========================================================

  onDateChange(): void {

    this.clearMessages();

    this.loadExpenses();

  }


  onExpenseModeChange(): void {

    this.clearMessages();

    this.selectedProductId = null;

    this.quantity = 1;

    this.cashAmount = 0;

    this.paidBy = 'HOTEL';

    this.personalProductPayment =
      'TRABAJADOR';

    this.addedProducts = [];

    this.description = '';

    this.calculateTotal();

  }


  onProductChange(): void {

    this.clearMessages();

    this.quantity = 1;

    this.calculateTotal();

  }


  onQuantityChange(): void {

    const value =
      Number(this.quantity);

    if (
      !Number.isFinite(value) ||
      value <= 0
    ) {

      this.quantity = 1;

    }

    this.calculateTotal();

  }


  onCashAmountChange(): void {

    const value =
      Number(this.cashAmount);

    if (
      !Number.isFinite(value) ||
      value < 0
    ) {

      this.cashAmount = 0;

    }

    this.calculateTotal();

  }


  // =========================================================
  // PRODUCTO SELECCIONADO
  // =========================================================

  getSelectedProduct(): Product | null {

    if (
      this.selectedProductId === null
    ) {

      return null;

    }

    return this.products.find(
      product =>
        Number(product.id) ===
        Number(this.selectedProductId)
    ) ?? null;

  }


  // =========================================================
  // STOCK DISPONIBLE REAL
  // =========================================================

  getAvailableProductStock(
    product: Product
  ): number {

    const stock =
      Number(product.stock || 0);

    const added =
      this.addedProducts.find(
        item =>
          Number(item.product.id) ===
          Number(product.id)
      );

    const used =
      added
        ? Number(added.quantity || 0)
        : 0;

    return Math.max(
      0,
      stock - used
    );

  }


  // =========================================================
  // VALIDAR AÑADIR PRODUCTO
  // =========================================================

  canAddProduct(): boolean {

    const product =
      this.getSelectedProduct();

    const quantity =
      Number(this.quantity);

    if (!product) {
      return false;
    }

    if (
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      return false;
    }

    return quantity <=
      this.getAvailableProductStock(product);

  }


  // =========================================================
  // AGREGAR PRODUCTO
  // =========================================================

  addProduct(): void {

    this.clearMessages();

    const product =
      this.getSelectedProduct();

    const quantity =
      Number(this.quantity);

    if (!product) {

      this.errorMessage =
        'Selecciona un producto.';

      return;

    }

    if (
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {

      this.errorMessage =
        'La cantidad debe ser mayor a cero.';

      return;

    }

    const availableStock =
      this.getAvailableProductStock(product);

    if (
      quantity > availableStock
    ) {

      this.errorMessage =
        `Stock insuficiente para ${product.name}. Disponible: ${availableStock}.`;

      return;

    }

    const existingItem =
      this.addedProducts.find(
        item =>
          Number(item.product.id) ===
          Number(product.id)
      );

    if (existingItem) {

      existingItem.quantity =
        Number(existingItem.quantity) +
        quantity;

      existingItem.amount =
        this.roundMoney(
          Number(product.price || 0) *
          existingItem.quantity
        );

    } else {

      this.addedProducts.push({

        product,

        quantity,

        amount:
          this.roundMoney(
            Number(product.price || 0) *
            quantity
          )

      });

    }

    this.selectedProductId = null;

    this.quantity = 1;

    this.calculateTotal();

    this.successMessage =
      'Producto añadido al gasto.';

  }


  // =========================================================
  // CANCELAR PRODUCTO SELECCIONADO
  // =========================================================

  cancelProductSelection(): void {

    this.selectedProductId = null;

    this.quantity = 1;

    this.clearMessages();

    this.calculateTotal();

  }


  // =========================================================
  // ELIMINAR PRODUCTO AGREGADO
  // =========================================================

  removeProduct(
    index: number
  ): void {

    if (
      index < 0 ||
      index >= this.addedProducts.length
    ) {

      return;

    }

    this.addedProducts.splice(
      index,
      1
    );

    this.calculateTotal();

    this.clearMessages();

  }


  // =========================================================
  // TOTAL
  // =========================================================

  calculateTotal(): void {

    if (
      this.expenseMode === ''
    ) {

      this.total = 0;

      return;

    }


    if (
      this.expenseMode === 'CASH'
    ) {

      this.total =
        this.roundMoney(
          Number(
            this.cashAmount || 0
          )
        );

      return;

    }


    this.total =
      this.roundMoney(
        this.addedProducts.reduce(
          (sum, item) =>
            sum +
            Number(item.amount || 0),
          0
        )
      );

  }


  // =========================================================
  // REGISTRAR GASTO
  // =========================================================

  registerExpense(): void {

    this.clearMessages();


    if (this.saving) {

      return;

    }


    if (
      this.expenseMode === ''
    ) {

      this.errorMessage =
        'Selecciona primero si el gasto es de Bodega o de Caja.';

      return;

    }


    const worker =
      this.workerName.trim();

    const reason =
      this.description.trim();

    if (!worker) {

      this.errorMessage =
        'Ingresa el nombre del trabajador.';

      return;

    }


    // El motivo solo es obligatorio para gastos directos de Caja.
    if (
      this.expenseMode === 'CASH' &&
      !reason
    ) {

      this.errorMessage =
        'Ingresa el motivo del gasto.';

      return;

    }


    // =======================================================
    // GASTO DIRECTO DE CAJA
    // =======================================================

    if (
      this.expenseMode === 'CASH'
    ) {

      const amount =
        this.roundMoney(
          Number(
            this.cashAmount || 0
          )
        );


      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {

        this.errorMessage =
          'Ingresa cuánto dinero se tomó de caja.';

        return;

      }


      this.saveCashExpense(
        worker,
        reason,
        amount
      );

      return;

    }


    // =======================================================
    // GASTO DE BODEGA
    // =======================================================

    if (
      this.addedProducts.length === 0
    ) {

      this.errorMessage =
        'Añade al menos un producto al gasto.';

      return;

    }


    for (
      const item of this.addedProducts
    ) {

      const availableStock =
        Number(item.product.stock || 0);

      if (
        item.quantity >
        availableStock
      ) {

        this.errorMessage =
          `Stock insuficiente para ${item.product.name}. Disponible: ${availableStock}.`;

        return;

      }

    }


    // =======================================================
    // LÓGICA DE PAGO
    // =======================================================

    let productPaidBy:
      CashExpensePaidBy;

    let productCashEffect:
      CashExpenseCashEffect;

    let productPersonalStatus:
      PersonalExpenseStatus;


    if (
      this.personalProductPayment ===
      'A_CUENTA'
    ) {

      productPaidBy =
        'TRABAJADOR';

      productCashEffect =
        'NINGUNO';

      productPersonalStatus =
        'A_CUENTA';

    } else {

      productPaidBy =
        'TRABAJADOR';

      productCashEffect =
        'INGRESO';

      productPersonalStatus =
        'PAGADO';

    }


    // =======================================================
    // DESCONTAR STOCK
    // =======================================================

    this.saving = true;

    this.cdr.detectChanges();


    const stockRequests =
      this.addedProducts.map(
        item =>
          this.productService
            .decreaseStock(
              item.product.id,
              item.quantity
            )
      );


    forkJoin(stockRequests)
      .pipe(

        finalize(() => {

          this.saving = false;

          this.cdr.detectChanges();

        })

      )
      .subscribe({

        next: () => {

          try {

            // ===============================================
            // REGISTRAR CADA PRODUCTO
            // ===============================================

            for (
              const item of this.addedProducts
            ) {

              const amount =
                this.roundMoney(
                  Number(
                    item.product.price || 0
                  ) *
                  item.quantity
                );


              this.cashShiftService.addExpense({

                date:
                  this.selectedDate,

                amount,

                description:
                  `${worker} - ${reason}`,

                type:
                  'PERSONAL',

                paidBy:
                  productPaidBy,

                cashEffect:
                  productCashEffect,

                personalStatus:
                  productPersonalStatus,

                productId:
                  item.product.id,

                productName:
                  item.product.name,

                quantity:
                  item.quantity

              });


              // =============================================
              // ACTUALIZAR STOCK LOCAL
              // =============================================

              item.product.stock =
                Math.max(
                  0,
                  Number(item.product.stock || 0) -
                  item.quantity
                );

            }


            // ===============================================
            // ACTUALIZAR LISTA
            // ===============================================

            this.loadExpenses();


            // ===============================================
            // MENSAJE
            // ===============================================

            this.successMessage =
              productPersonalStatus ===
                'A_CUENTA'

                ? 'Guardado exitosamente. Se descontó stock y los productos quedaron a cuenta. No afecta caja.'

                : 'Guardado exitosamente. Se descontó stock y el pago ingresó a caja.';


            this.errorMessage = '';


            // ===============================================
            // LIMPIAR FORMULARIO
            // ===============================================

            this.resetForm();


            // ===============================================
            // ACTUALIZAR VISTA
            // ===============================================

            this.cdr.detectChanges();

          } catch (error) {

            this.errorMessage =
              error instanceof Error
                ? error.message
                : 'No se pudo registrar el gasto.';

            this.cdr.detectChanges();

          }

        },


        // ===================================================
        // ERROR
        // ===================================================

        error: error => {

          this.errorMessage =
            error?.error?.message ||
            'No se pudo descontar el stock de los productos.';

          this.cdr.detectChanges();

        }

      });

  }


  // =========================================================
  // GASTO DIRECTO DE CAJA
  // =========================================================

  private saveCashExpense(
    worker: string,
    reason: string,
    amount: number
  ): void {

    this.saving = true;

    this.cdr.detectChanges();


    try {

      this.cashShiftService.addExpense({

        date:
          this.selectedDate,

        amount,

        description:
          `${worker} - ${reason}`,

        type:
          'PERSONAL',

        paidBy:
          'HOTEL',

        cashEffect:
          'EGRESO',

        personalStatus:
          'PAGADO'

      });


      this.saving = false;


      this.successMessage =
        'Guardado exitosamente. El gasto de caja fue registrado.';

      this.errorMessage = '';


      this.loadExpenses();

      this.resetForm();

      this.cdr.detectChanges();


    } catch (error) {

      this.saving = false;

      this.errorMessage =
        error instanceof Error
          ? error.message
          : 'No se pudo registrar el gasto.';

      this.cdr.detectChanges();

    }

  }


  // =========================================================
  // ELIMINAR GASTO
  // =========================================================

  deleteExpense(
    expense: CashExpense
  ): void {

    const confirmed =
      window.confirm(
        `¿Eliminar el gasto de "${expense.description}" por S/ ${this.formatMoney(expense.amount)}?`
      );


    if (!confirmed) {

      return;

    }


    // =======================================================
    // DEVOLVER PRODUCTO AL STOCK
    // =======================================================

    if (
      expense.productId &&
      expense.quantity &&
      expense.quantity > 0
    ) {

      this.productService
        .updateStock(
          expense.productId,
          expense.quantity
        )
        .subscribe({

          next: () => {

            this.finishDeleteExpense(
              expense
            );

          },

          error: () => {

            this.errorMessage =
              'No se pudo devolver el producto al stock. El gasto no fue eliminado.';

            this.cdr.detectChanges();

          }

        });


      return;

    }


    this.finishDeleteExpense(
      expense
    );

  }


  private finishDeleteExpense(
    expense: CashExpense
  ): void {

    const deleted =
      this.cashShiftService
        .deleteExpense(
          expense.id
        );


    if (!deleted) {

      this.errorMessage =
        'No se pudo eliminar el gasto.';

      this.cdr.detectChanges();

      return;

    }


    this.successMessage =
      'Gasto eliminado correctamente.';

    this.loadExpenses();


    if (
      expense.productId &&
      expense.quantity &&
      expense.quantity > 0
    ) {

      this.loadProducts();

    }

    this.cdr.detectChanges();

  }


  // =========================================================
  // DATOS PARA LA VISTA
  // =========================================================

  getWorkerName(
    expense: CashExpense
  ): string {

    const parts =
      expense.description.split(
        ' - '
      );


    return parts[0] || '—';

  }


  getReason(
    expense: CashExpense
  ): string {

    const parts =
      expense.description.split(
        ' - '
      );


    return (
      parts.slice(1).join(' - ') ||
      expense.description
    );

  }


  getPaymentLabel(
    paidBy: CashExpensePaidBy
  ): string {

    if (
      this.expenseMode === 'PRODUCT'
    ) {

      return this.personalProductPayment ===
        'A_CUENTA'

        ? 'A cuenta'

        : 'Pagar con mi dinero';

    }


    return paidBy === 'HOTEL'
      ? 'Caja del hotel'
      : 'Dinero propio';

  }


  getPaymentClass(
    paidBy: CashExpensePaidBy
  ): string {

    if (
      this.expenseMode === 'PRODUCT'
    ) {

      return this.personalProductPayment ===
        'A_CUENTA'

        ? 'payment-account'

        : 'payment-worker';

    }


    return paidBy === 'HOTEL'
      ? 'payment-hotel'
      : 'payment-worker';

  }


  getExpenseModeLabel(
    expense: CashExpense
  ): string {

    return expense.productId
      ? 'Producto'
      : 'Dinero de caja';

  }


  toNumber(
    value: unknown
  ): number {

    return Number(
      value || 0
    );

  }


  formatMoney(
    value: number
  ): string {

    return this.cashShiftService
      .formatMoney(value);

  }


  // =========================================================
  // LIMPIAR FORMULARIO
  // =========================================================

  private resetForm(): void {

    this.workerName = '';

    this.description = '';

    this.expenseMode = '';

    this.selectedProductId = null;

    this.quantity = 1;

    this.cashAmount = 0;

    this.paidBy = 'HOTEL';

    this.personalProductPayment =
      'TRABAJADOR';

    this.addedProducts = [];

    this.total = 0;

  }


  // =========================================================
  // MENSAJES
  // =========================================================

  clearMessages(): void {

    this.errorMessage = '';

    this.successMessage = '';

  }


  // =========================================================
  // DINERO
  // =========================================================

  private roundMoney(
    value: number
  ): number {

    return this.cashShiftService
      .roundMoney(value);

  }

}

