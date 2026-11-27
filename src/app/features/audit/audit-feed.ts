import { signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuditAction, AuditItem, BackofficeAuditService } from '../../api';
import { messageForError } from '../../core/errors/error-messages';

export interface AuditFilters {
  accountId?: string | null;
  action?: AuditAction | null;
}

const PAGE_SIZE = 30;

/**
 * Lista paginada da trilha de auditoria, usada pela tela geral e pela aba da
 * conta. Trocar os filtros cancela o pedido anterior e recomeça do topo.
 */
export class AuditFeed {
  readonly items = signal<AuditItem[]>([]);
  readonly nextCursor = signal<string | null>(null);
  readonly loading = signal(false);
  readonly loaded = signal(false);
  readonly error = signal('');

  private filters: AuditFilters = {};
  private request?: Subscription;

  constructor(private readonly api: BackofficeAuditService) {}

  reset(filters: AuditFilters): void {
    this.filters = filters;
    this.items.set([]);
    this.nextCursor.set(null);
    this.loaded.set(false);
    this.fetch(null);
  }

  loadMore(): void {
    const cursor = this.nextCursor();
    if (cursor && !this.loading()) {
      this.fetch(cursor);
    }
  }

  private fetch(cursor: string | null): void {
    this.request?.unsubscribe();
    this.loading.set(true);
    this.error.set('');
    this.request = this.api
      .apiV1BackofficeAuditGet(
        this.filters.accountId ?? undefined,
        undefined,
        this.filters.action ?? undefined,
        PAGE_SIZE,
        cursor ?? undefined,
      )
      .subscribe({
        next: (page) => {
          const seen = new Set(this.items().map((i) => i.id));
          this.items.update((items) => [...items, ...page.items.filter((i) => !seen.has(i.id))]);
          this.nextCursor.set(page.nextCursor);
          this.loaded.set(true);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.error.set(messageForError(error));
          this.loading.set(false);
        },
      });
  }
}
