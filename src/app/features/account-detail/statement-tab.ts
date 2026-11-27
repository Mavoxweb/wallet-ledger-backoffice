import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { BackofficeAccountsService, BackofficeStatementItem } from '../../api';
import { isNetworkError, NETWORK_MESSAGE, UNEXPECTED_MESSAGE } from '../../core/errors/problem';
import { DateTimePipe, MoneyPipe } from '../../shared/money.pipe';
import { StatusBadge } from '../../shared/status-badge';

const PAGE_SIZE = 20;

/** Título de uma linha do extrato: o que aconteceu e com quem. */
export function movementTitle(item: BackofficeStatementItem): string {
  const who = item.counterpartyMaskedName;
  if (item.type === 'deposit') {
    return 'Depósito';
  }
  if (item.type === 'reversal') {
    if (!who) {
      return 'Estorno de depósito';
    }
    return item.direction === 'in'
      ? `Estorno devolvido por ${who}`
      : `Estorno devolvido para ${who}`;
  }
  return item.direction === 'in' ? `Pix recebido de ${who}` : `Pix enviado para ${who}`;
}

@Component({
  selector: 'wl-statement-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StatusBadge, MoneyPipe, DateTimePipe],
  templateUrl: './statement-tab.html',
  styleUrl: './statement-tab.scss',
})
export class StatementTab {
  private readonly api = inject(BackofficeAccountsService);

  readonly accountId = input.required<string>();

  protected readonly items = signal<BackofficeStatementItem[]>([]);
  protected readonly nextCursor = signal<string | null>(null);
  protected readonly loading = signal(false);
  protected readonly loaded = signal(false);
  protected readonly error = signal('');
  protected readonly title = movementTitle;

  constructor() {
    // Quando a conta muda (ou a aba abre), recomeça do topo do extrato.
    effect(() => {
      const id = this.accountId();
      untracked(() => this.reload(id));
    });
  }

  /** Recarrega do início (por exemplo, depois de um estorno). */
  reload(id = this.accountId()): void {
    this.items.set([]);
    this.nextCursor.set(null);
    this.loaded.set(false);
    this.fetch(id, null);
  }

  protected loadMore(): void {
    const cursor = this.nextCursor();
    if (cursor && !this.loading()) {
      this.fetch(this.accountId(), cursor);
    }
  }

  private fetch(id: string, cursor: string | null): void {
    this.loading.set(true);
    this.error.set('');
    this.api.apiV1BackofficeAccountsIdStatementGet(id, PAGE_SIZE, cursor ?? undefined).subscribe({
      next: (page) => {
        const seen = new Set(this.items().map((i) => i.postingId));
        this.items.update((items) => [
          ...items,
          ...page.items.filter((i) => !seen.has(i.postingId)),
        ]);
        this.nextCursor.set(page.nextCursor);
        this.loaded.set(true);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.error.set(isNetworkError(error) ? NETWORK_MESSAGE : UNEXPECTED_MESSAGE);
        this.loading.set(false);
      },
    });
  }
}
