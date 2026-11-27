import { effect, inject, Injectable, signal, untracked } from '@angular/core';
import { catchError, EMPTY, Observable, of, Subject, switchMap, tap, timer } from 'rxjs';
import {
  AccountStatus,
  BackofficeAccountPage,
  BackofficeAccountsService,
  BackofficeAccountSummary,
} from '../../api';
import { SessionStore } from '../../core/auth/session.store';
import { isNetworkError, NETWORK_MESSAGE, UNEXPECTED_MESSAGE } from '../../core/errors/problem';

const DEBOUNCE_MS = 300;
const PAGE_SIZE = 25;

/**
 * Estado da lista de contas. Fica no `root` de propósito: ao voltar do detalhe,
 * a busca e a página carregada continuam onde a pessoa deixou.
 */
@Injectable({ providedIn: 'root' })
export class AccountsStore {
  private readonly api = inject(BackofficeAccountsService);

  readonly query = signal('');
  readonly status = signal<AccountStatus | null>(null);
  readonly items = signal<BackofficeAccountSummary[]>([]);
  readonly nextCursor = signal<string | null>(null);
  readonly loading = signal(false);
  readonly loaded = signal(false);
  readonly error = signal('');

  /**
   * Cada pedido de busca passa por aqui. `switchMap` cancela o anterior: a
   * digitação reinicia a espera de 300 ms, e uma resposta antiga nunca
   * sobrescreve uma busca mais nova.
   */
  private readonly searches = new Subject<{ debounce: boolean }>();

  constructor() {
    // Saiu da sessão: a próxima pessoa nesta aba não vê a busca de quem saiu.
    // Só na passagem de "logado" para "deslogado", não na primeira leitura.
    const session = inject(SessionStore);
    let signedIn = false;
    effect(() => {
      const now = session.role() !== null;
      if (signedIn && !now) {
        untracked(() => this.reset());
      }
      signedIn = now;
    });

    this.searches
      .pipe(
        switchMap(({ debounce }) =>
          (debounce ? timer(DEBOUNCE_MS) : of(0)).pipe(switchMap(() => this.fetch(null))),
        ),
      )
      .subscribe((page) => {
        this.items.set(page.items);
        this.nextCursor.set(page.nextCursor);
      });
  }

  private reset(): void {
    this.query.set('');
    this.status.set(null);
    this.items.set([]);
    this.nextCursor.set(null);
    this.loaded.set(false);
    this.error.set('');
  }

  /** Texto digitado: busca 300 ms depois da última tecla. */
  search(text: string): void {
    this.query.set(text);
    this.searches.next({ debounce: true });
  }

  setStatus(status: AccountStatus | null): void {
    this.status.set(status);
    this.searches.next({ debounce: false });
  }

  load(): void {
    this.searches.next({ debounce: false });
  }

  /**
   * O detalhe avisa o estado atual de uma conta (depois de um bloqueio, por
   * exemplo). Se ela está na lista guardada, a lista passa a mostrar o mesmo,
   * sem recarregar e sem perder a página em que a pessoa estava.
   */
  sync(account: Pick<BackofficeAccountSummary, 'accountId' | 'status' | 'balanceCents'>): void {
    const items = this.items();
    const index = items.findIndex((i) => i.accountId === account.accountId);
    if (index < 0) {
      return;
    }
    const current = items[index];
    if (current.status === account.status && current.balanceCents === account.balanceCents) {
      return;
    }
    const next = [...items];
    next[index] = { ...current, status: account.status, balanceCents: account.balanceCents };
    this.items.set(next);
  }

  loadMore(): void {
    const cursor = this.nextCursor();
    if (!cursor || this.loading()) {
      return;
    }
    this.fetch(cursor).subscribe((page) => {
      const seen = new Set(this.items().map((i) => i.accountId));
      this.items.update((items) => [...items, ...page.items.filter((i) => !seen.has(i.accountId))]);
      this.nextCursor.set(page.nextCursor);
    });
  }

  /** Uma página da API. Em erro, avisa e não emite nada: a lista atual fica. */
  private fetch(cursor: string | null): Observable<BackofficeAccountPage> {
    const q = this.query().trim();
    this.loading.set(true);
    this.error.set('');
    return this.api
      .apiV1BackofficeAccountsGet(
        q || undefined,
        this.status() ?? undefined,
        PAGE_SIZE,
        cursor ?? undefined,
      )
      .pipe(
        tap({ next: () => this.loaded.set(true), finalize: () => this.loading.set(false) }),
        catchError((error: unknown) => {
          this.error.set(isNetworkError(error) ? NETWORK_MESSAGE : UNEXPECTED_MESSAGE);
          return EMPTY;
        }),
      );
  }
}
