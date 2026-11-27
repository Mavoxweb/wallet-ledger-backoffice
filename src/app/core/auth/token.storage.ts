import { Injectable } from '@angular/core';

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

const KEY = 'wl.session';

/**
 * Tokens no `sessionStorage`: a sessão acaba quando a aba fecha e não fica
 * esquecida aberta num computador compartilhado.
 */
@Injectable({ providedIn: 'root' })
export class TokenStorage {
  read(): StoredTokens | null {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (!raw) {
        return null;
      }
      const value = JSON.parse(raw) as Partial<StoredTokens>;
      return typeof value.accessToken === 'string' && typeof value.refreshToken === 'string'
        ? { accessToken: value.accessToken, refreshToken: value.refreshToken }
        : null;
    } catch {
      return null;
    }
  }

  write(tokens: StoredTokens): void {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(tokens));
    } catch {
      // Armazenamento indisponível (modo privado restrito): a sessão vive só na memória.
    }
  }

  clear(): void {
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      // Nada a limpar.
    }
  }
}
