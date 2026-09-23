import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Interceptor HTTP de autenticacion.
 *
 * Adjunta el header Authorization: Bearer <token>
 * a todas las peticiones HTTP salientes cuando el
 * usuario tiene un token JWT almacenado en localStorage.
 *
 * Sin este interceptor, las peticiones POST/PUT/PATCH/DELETE
 * llegan al backend sin autenticacion y Spring Security
 * devuelve 403.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {

  const token = localStorage.getItem('hotel_token');

  // Si no hay token o es el token estatico de recepcion,
  // no se adjunta el header Authorization
  if (!token || token === 'RECEPTION_ACCESS') {
    return next(req);
  }

  const authReq = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });

  return next(authReq);
};
