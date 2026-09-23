
import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  OnInit,
  inject
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  Product
} from '../../core/models/hotel.models';

import { ProductService } from '../../core/services/product.service';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './products.html',
  styleUrl: './products.css'
})
export class ProductsComponent implements OnInit {

  private readonly productService =
    inject(ProductService);

  private readonly cdr =
    inject(ChangeDetectorRef);


  // =========================================================
  // DATOS
  // =========================================================

  products: Product[] = [];

  searchTerm = '';


  // =========================================================
  // MODAL PRODUCTO
  // =========================================================

  showProductModal = false;

  editingProduct: Product | null = null;

  productForm = {
    name: '',
    price: 0,
    stock: 0
  };


  // =========================================================
  // MODAL STOCK
  // =========================================================

  showStockModal = false;

  selectedProduct: Product | null = null;

  stockQuantity = 1;


  // =========================================================
  // ESTADO
  // =========================================================

  saving = false;

  error = '';

  success = '';


  // =========================================================
  // INICIO
  // =========================================================

  ngOnInit(): void {
    this.loadProducts();
  }


  // =========================================================
  // CARGAR PRODUCTOS
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
            'No se pudieron cargar los productos.';

          this.cdr.detectChanges();
        }
      });
  }


  // =========================================================
  // PRODUCTOS FILTRADOS
  // =========================================================

  get filteredProducts(): Product[] {

    const search =
      this.searchTerm
        .trim()
        .toLowerCase();

    if (!search) {
      return this.products;
    }

    return this.products.filter(product =>
      product.name
        .toLowerCase()
        .includes(search)
    );
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
      name.includes('cuates') ||
      name.includes('gaseosa') ||
      name.includes('coca') ||
      name.includes('pepsi') ||
      name.includes('sprite')
    ) {
      return 'Bebidas';
    }

    if (
      name.includes('shampoo') ||
      name.includes('h&s') ||
      name.includes('jabón') ||
      name.includes('jabon') ||
      name.includes('papel') ||
      name.includes('toalla') ||
      name.includes('aseo')
    ) {
      return 'Aseo';
    }

    return 'Otros';
  }


  // =========================================================
  // ESTADO DEL STOCK
  // =========================================================

  getStockLabel(product: Product): string {

    if (product.stock <= 0) {
      return 'Sin stock';
    }

    if (product.stock < 10) {
      return 'Bajo stock';
    }

    return 'Disponible';
  }


  getStockClass(product: Product): string {

    if (product.stock <= 0) {
      return 'stock-danger';
    }

    if (product.stock < 10) {
      return 'stock-warning';
    }

    return 'stock-success';
  }


  // =========================================================
  // NUEVO PRODUCTO
  // =========================================================

  openCreateProduct(): void {

    this.clearMessages();

    this.editingProduct = null;

    this.productForm = {
      name: '',
      price: 0,
      stock: 0
    };

    this.showProductModal = true;
  }


  // =========================================================
  // EDITAR PRODUCTO
  // =========================================================

  openEditProduct(product: Product): void {

    this.clearMessages();

    this.editingProduct = product;

    this.productForm = {
      name: product.name,
      price: Number(product.price),
      stock: Number(product.stock)
    };

    this.showProductModal = true;
  }


  // =========================================================
  // CERRAR MODAL PRODUCTO
  // =========================================================

  closeProductModal(): void {

    if (this.saving) {
      return;
    }

    this.showProductModal = false;

    this.editingProduct = null;
  }


  // =========================================================
  // GUARDAR PRODUCTO
  // =========================================================

  saveProduct(): void {

    this.clearMessages();

    const name =
      this.productForm.name.trim();

    const price =
      Number(this.productForm.price);

    const stock =
      Number(this.productForm.stock);


    if (!name) {

      this.error =
        'Ingresa el nombre del producto.';

      return;
    }


    if (
      !Number.isFinite(price) ||
      price < 0
    ) {

      this.error =
        'Ingresa un precio válido.';

      return;
    }


    if (
      !Number.isFinite(stock) ||
      stock < 0 ||
      !Number.isInteger(stock)
    ) {

      this.error =
        'El stock debe ser un número entero mayor o igual a 0.';

      return;
    }


    this.saving = true;


    const productData:
      Omit<Product, 'id'> = {

      name,

      price,

      stock
    };


    // =======================================================
    // EDITAR
    // =======================================================

    if (this.editingProduct) {

      this.productService
        .update(
          this.editingProduct.id,
          productData
        )
        .subscribe({

          next: updatedProduct => {

            const index =
              this.products.findIndex(
                product =>
                  product.id ===
                  this.editingProduct?.id
              );

            if (index !== -1) {

              this.products[index] =
                updatedProduct;
            }

            this.showProductModal =
              false;

            this.editingProduct =
              null;

            this.saving =
              false;

            this.success =
              'Producto actualizado correctamente.';

            this.cdr.detectChanges();
          },

          error: error => {

            console.error(
              'Error actualizando producto:',
              error
            );

            this.error =
              'No se pudo actualizar el producto.';

            this.saving =
              false;

            this.cdr.detectChanges();
          }
        });

      return;
    }


    // =======================================================
    // CREAR
    // =======================================================

    this.productService
      .create(productData)
      .subscribe({

        next: createdProduct => {

          this.products = [
            ...this.products,
            createdProduct
          ];

          this.showProductModal =
            false;

          this.saving =
            false;

          this.success =
            'Producto creado correctamente.';

          this.cdr.detectChanges();
        },

        error: error => {

          console.error(
            'Error creando producto:',
            error
          );

          this.error =
            'No se pudo crear el producto.';

          this.saving =
            false;

          this.cdr.detectChanges();
        }
      });
  }


  // =========================================================
  // AGREGAR STOCK
  // =========================================================

  openAddStock(product: Product): void {

    this.clearMessages();

    this.selectedProduct =
      product;

    this.stockQuantity =
      1;

    this.showStockModal =
      true;
  }


  // =========================================================
  // CERRAR STOCK
  // =========================================================

  closeStockModal(): void {

    if (this.saving) {
      return;
    }

    this.showStockModal =
      false;

    this.selectedProduct =
      null;
  }


  // =========================================================
  // CONFIRMAR STOCK
  // =========================================================

  confirmAddStock(): void {

    this.clearMessages();

    if (!this.selectedProduct) {
      return;
    }

    const quantity =
      Number(this.stockQuantity);


    if (
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {

      this.error =
        'Ingresa una cantidad válida de stock.';

      return;
    }


    this.saving =
      true;


    this.productService
      .updateStock(
        this.selectedProduct.id,
        quantity
      )
      .subscribe({

        next: updatedProduct => {

          const index =
            this.products.findIndex(
              product =>
                product.id ===
                updatedProduct.id
            );

          if (index !== -1) {

            this.products[index] =
              updatedProduct;
          }

          this.showStockModal =
            false;

          this.selectedProduct =
            null;

          this.saving =
            false;

          this.success =
            `Se agregaron ${quantity} unidades a "${updatedProduct.name}".`;

          this.cdr.detectChanges();
        },

        error: error => {

          console.error(
            'Error agregando stock:',
            error
          );

          this.error =
            'No se pudo agregar el stock.';

          this.saving =
            false;

          this.cdr.detectChanges();
        }
      });
  }


  // =========================================================
  // ELIMINAR PRODUCTO
  // =========================================================

  deleteProduct(product: Product): void {

    this.clearMessages();

    const confirmed =
      window.confirm(
        `¿Deseas eliminar el producto "${product.name}"?`
      );

    if (!confirmed) {
      return;
    }


    this.saving =
      true;


    this.productService
      .delete(product.id)
      .subscribe({

        next: () => {

          this.products =
            this.products.filter(
              item =>
                item.id !==
                product.id
            );

          this.saving =
            false;

          this.success =
            'Producto eliminado correctamente.';

          this.cdr.detectChanges();
        },

        error: error => {

          console.error(
            'Error eliminando producto:',
            error
          );

          this.error =
            'No se pudo eliminar el producto. Puede tener consumos asociados.';

          this.saving =
            false;

          this.cdr.detectChanges();
        }
      });
  }


  // =========================================================
  // LIMPIAR MENSAJES
  // =========================================================

  clearMessages(): void {

    this.error = '';

    this.success = '';
  }
}

