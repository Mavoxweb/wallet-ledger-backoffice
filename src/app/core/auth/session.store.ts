import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  catchError,
  finalize,
  firstValueFrom,
  map,
  Observable,
  shareReplay,
  throwError,
} from 'rxjs';
import { AuthService, TokenResponse } from '../../api';
import { readClaims } from './jwt';
import { StoredTokens, TokenStorage } from './token.storage';

export type StaffRole = 'Operator' | 'Admin';

/** Login válido, mas de cliente: o backoffice é só da equipe de operação. */
export class StaffOnlyError extends Error {
  constructor() {
    super('Este acesso é só para a equipe de operação.');
    this.name = 'StaffOnlyError';
  }
}

/**
 * A renovação foi recusada pela API (4xx): o refresh token não vale mais e a
 * sessão acabou. Erro de rede ou 5xx não entram aqui: a sessão continua, porque
 * o problema é a conexão ou o servidor, não o login (a mesma regra do app).
 */
export function isSessionRejected(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status >= 400 && error.status < 500;
}

@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly auth = inject(AuthService);
  private readonly storage = inject(TokenStorage);
  private readonly router = inject(Router);

  private readonly tokens = signal<StoredTokens | null>(this.storage.read());
  private readonly claims = computed(() => {
    const tokens = this.tokens();
    return tokens ? readClaims(tokens.accessToken) : null;
  });

  /** Perfil da equipe logada. Um token de cliente nunca conta como sessão aqui. */
  readonly role = computed<StaffRole | null>(() => {
    const role = this.claims()?.role;
    return role === 'Operator' || role === 'Admin' ? role : null;
  });
  readonly isAdmin = computed(() => this.role() === 'Admin');
  readonly userName = computed(() => this.claims()?.name ?? '');

  private refreshing: Observable<string> | null = null;

  accessToken(): string | null {
    return this.tokens()?.accessToken ?? null;
  }

  async login(email: string, password: string): Promise<void> {
    const tokens = await firstValueFrom(this.auth.apiV1AuthLoginPost({ email, password }));
    const role = readClaims(tokens.accessToken)?.role;
    if (role !== 'Operator' && role !== 'Admin') {
      // O cliente logou de verdade na API: revoga o refresh token para não sobrar sessão.
      this.revoke(tokens.refreshToken);
      throw new StaffOnlyError();
    }
    this.save(tokens);
  }

  /**
   * Renova o access token. Pedidos simultâneos compartilham a mesma renovação:
   * três `401` ao mesmo tempo geram uma chamada só, porque a API gira o refresh
   * token e um segundo uso do antigo derrubaria todas as sessões.
   */
  refreshAccessToken(): Observable<string> {
    const refreshToken = this.tokens()?.refreshToken;
    if (!refreshToken) {
      return throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Sem sessão' }));
    }
    this.refreshing ??= this.auth.apiV1AuthRefreshPost({ refreshToken }).pipe(
      map((tokens) => {
        this.save(tokens);
        return tokens.accessToken;
      }),
      catchError((error: unknown) => {
        if (isSessionRejected(error)) {
          this.endSession();
        }
        return throwError(() => error);
      }),
      finalize(() => (this.refreshing = null)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.refreshing;
  }

  /** Sair: revoga o refresh token na API (sem esperar) e limpa a sessão local. */
  logout(): void {
    const refreshToken = this.tokens()?.refreshToken;
    this.clear();
    if (refreshToken) {
      this.revoke(refreshToken);
    }
    void this.router.navigateByUrl('/login');
  }

  clear(): void {
    this.tokens.set(null);
    this.storage.clear();
  }

  private endSession(): void {
    this.clear();
    void this.router.navigateByUrl('/login');
  }

  private save(tokens: TokenResponse): void {
    const stored = { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
    this.tokens.set(stored);
    this.storage.write(stored);
  }

  private revoke(refreshToken: string): void {
    this.auth.apiV1AuthLogoutPost({ refreshToken }).subscribe({ error: () => undefined });
  }
}
