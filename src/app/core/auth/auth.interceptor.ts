import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { isSessionRejected, SessionStore } from './session.store';

const AUTH_ENDPOINTS = ['/api/v1/auth/login', '/api/v1/auth/refresh', '/api/v1/auth/logout'];

function isAuthEndpoint(url: string): boolean {
  return AUTH_ENDPOINTS.some((path) => url.endsWith(path));
}

function withToken(request: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return request.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

/**
 * Anexa o access token e, num `401`, renova uma vez e repete o pedido.
 * - Renovação recusada (4xx): a sessão acaba e o pedido falha com o `401` original.
 * - Renovação sem resposta (rede) ou com 5xx: a sessão continua, e o pedido falha
 *   com o erro da renovação, para a tela dizer "sem conexão" e não "faça login".
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  if (isAuthEndpoint(request.url)) {
    return next(request);
  }

  const session = inject(SessionStore);
  const token = session.accessToken();
  if (!token) {
    return next(request);
  }

  return next(withToken(request, token)).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }
      return session.refreshAccessToken().pipe(
        catchError((refreshError: unknown) =>
          throwError(() => (isSessionRejected(refreshError) ? error : refreshError)),
        ),
        switchMap((newToken) => next(withToken(request, newToken))),
      );
    }),
  );
};
