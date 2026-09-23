import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Product } from '../models/hotel.models';

@Injectable({
  providedIn: 'root'
})
export class ProductService {

  private readonly http = inject(HttpClient);

  private readonly apiUrl =
    'http://localhost:8080/api/products';


  getAll(): Observable<Product[]> {

    return this.http.get<Product[]>(
      this.apiUrl
    );

  }


  getById(
    id: number
  ): Observable<Product> {

    return this.http.get<Product>(
      `${this.apiUrl}/${id}`
    );

  }


  create(
    product: Omit<Product, 'id'>
  ): Observable<Product> {

    return this.http.post<Product>(
      this.apiUrl,
      product
    );

  }


  update(
    id: number,
    product: Omit<Product, 'id'>
  ): Observable<Product> {

    return this.http.put<Product>(
      `${this.apiUrl}/${id}`,
      product
    );

  }


  /**
   * Aumentar stock.
   * Se mantiene para Productos/Admin.
   */
  updateStock(
    id: number,
    quantity: number
  ): Observable<Product> {

    return this.http.patch<Product>(
      `${this.apiUrl}/${id}/stock`,
      null,
      {
        params: {
          quantity
        }
      }
    );

  }


  /**
   * Descontar stock por consumo o gasto de personal.
   *
   * La cantidad debe enviarse positiva.
   */
  decreaseStock(
    id: number,
    quantity: number
  ): Observable<Product> {

    return this.http.patch<Product>(
      `${this.apiUrl}/${id}/stock/decrease`,
      null,
      {
        params: {
          quantity
        }
      }
    );

  }


  delete(
    id: number
  ): Observable<void> {

    return this.http.delete<void>(
      `${this.apiUrl}/${id}`
    );

  }

}