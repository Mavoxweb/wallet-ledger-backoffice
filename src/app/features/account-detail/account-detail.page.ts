import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, map, Observable, of, startWith, Subject, switchMap } from 'rxjs';
import { BackofficeAccountDetail, BackofficeAccountsService } from '../../api';
import {
  isNetworkError,
  NETWORK_MESSAGE,
  problemCode,
  UNEXPECTED_MESSAGE,
} from '../../core/errors/problem';
import { DayPipe, MoneyPipe } from '../../shared/money.pipe';
import { StatusBadge } from '../../shared/status-badge';
import { PixKeysTab } from './pix-keys-tab';
import { StatementTab } from './statement-tab';

export type DetailTab = 'extrato' | 'chaves';

const TABS: { id: DetailTab; label: string }[] = [
  { id: 'extrato', label: 'Extrato' },
  { id: 'chaves', label: 'Chaves Pix' },
];

type DetailState =
  | { kind: 'loading' }
  | { kind: 'ready'; account: BackofficeAccountDetail }
  | { kind: 'error'; message: string };

@Component({
  selector: 'wl-account-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, StatusBadge, MoneyPipe, DayPipe, StatementTab, PixKeysTab],
  templateUrl: './account-detail.page.html',
  styleUrl: './account-detail.page.scss',
})
export class AccountDetailPage {
  private readonly api = inject(BackofficeAccountsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly reloads = new Subject<void>();

  protected readonly tabs = TABS;

  /** A aba vive na URL (`?aba=chaves`): dá para mandar o link para um colega. */
  private readonly tabParam = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('aba'))),
    { initialValue: null },
  );
  protected readonly tab = computed<DetailTab>(() =>
    TABS.some((t) => t.id === this.tabParam()) ? (this.tabParam() as DetailTab) : 'extrato',
  );

  protected readonly state = toSignal(
    this.route.paramMap.pipe(
      map((params) => params.get('id') ?? ''),
      switchMap((id) =>
        this.reloads.pipe(
          startWith(undefined),
          switchMap(() => this.load(id)),
        ),
      ),
    ),
    { initialValue: { kind: 'loading' } as DetailState },
  );

  protected readonly account = computed(() => {
    const state = this.state();
    return state.kind === 'ready' ? state.account : null;
  });

  protected selectTab(tab: DetailTab): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { aba: tab },
      replaceUrl: true,
    });
  }

  /** Setas esquerda/direita andam entre as abas, como o padrão de abas do ARIA. */
  protected onTabKey(event: KeyboardEvent, index: number): void {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!step) {
      return;
    }
    event.preventDefault();
    const next = TABS[(index + step + TABS.length) % TABS.length];
    this.selectTab(next.id);
    const list = (event.currentTarget as HTMLElement).parentElement;
    queueMicrotask(() => list?.querySelector<HTMLElement>(`[data-tab="${next.id}"]`)?.focus());
  }

  /** Recarrega cabeçalho e saldo (por exemplo, depois de um bloqueio). */
  reload(): void {
    this.reloads.next();
  }

  private load(id: string): Observable<DetailState> {
    return this.api.apiV1BackofficeAccountsIdGet(id).pipe(
      map((account): DetailState => ({ kind: 'ready', account })),
      catchError((error: unknown) =>
        of<DetailState>({
          kind: 'error',
          message:
            problemCode(error) === 'not_found'
              ? 'Conta não encontrada.'
              : isNetworkError(error)
                ? NETWORK_MESSAGE
                : UNEXPECTED_MESSAGE,
        }),
      ),
      startWith<DetailState>({ kind: 'loading' }),
    );
  }
}
