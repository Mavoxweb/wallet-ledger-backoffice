import { ChangeDetectionStrategy, Component, computed, inject, viewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, map, Observable, of, startWith, Subject, switchMap } from 'rxjs';
import {
  BackofficeAccountDetail,
  BackofficeAccountsService,
  BackofficeStatementItem,
} from '../../api';
import { SessionStore } from '../../core/auth/session.store';
import {
  isNetworkError,
  NETWORK_MESSAGE,
  problemCode,
  UNEXPECTED_MESSAGE,
} from '../../core/errors/problem';
import { DayPipe, MoneyPipe } from '../../shared/money.pipe';
import { StatusBadge } from '../../shared/status-badge';
import { AuditTab } from './audit-tab';
import { BlockDialog, BlockDialogData } from './block-dialog';
import { PixKeysTab } from './pix-keys-tab';
import { ReversalDialog, ReversalDialogData } from './reversal-dialog';
import { StatementTab } from './statement-tab';

export type DetailTab = 'extrato' | 'chaves' | 'auditoria';

const TABS: { id: DetailTab; label: string }[] = [
  { id: 'extrato', label: 'Extrato' },
  { id: 'chaves', label: 'Chaves Pix' },
  { id: 'auditoria', label: 'Auditoria' },
];

type DetailState =
  | { kind: 'loading' }
  | { kind: 'ready'; account: BackofficeAccountDetail }
  | { kind: 'error'; message: string };

@Component({
  selector: 'wl-account-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, StatusBadge, MoneyPipe, DayPipe, StatementTab, PixKeysTab, AuditTab],
  templateUrl: './account-detail.page.html',
  styleUrl: './account-detail.page.scss',
})
export class AccountDetailPage {
  private readonly api = inject(BackofficeAccountsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  protected readonly session = inject(SessionStore);

  private readonly reloads = new Subject<void>();
  private readonly statementTab = viewChild(StatementTab);
  private readonly auditTab = viewChild(AuditTab);

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

  protected openStatusDialog(account: BackofficeAccountDetail, mode: 'block' | 'unblock'): void {
    this.dialog
      .open<BlockDialog, BlockDialogData, boolean>(BlockDialog, {
        data: { account, mode },
        width: '500px',
        maxWidth: 'calc(100vw - 32px)',
        ariaLabelledBy: 'dialog-title',
      })
      .afterClosed()
      .subscribe((done) => {
        if (done) {
          this.afterAction(
            mode === 'block'
              ? 'Conta bloqueada. O registro está na auditoria.'
              : 'Conta desbloqueada. O registro está na auditoria.',
          );
        }
      });
  }

  protected openReversal(account: BackofficeAccountDetail, item: BackofficeStatementItem): void {
    this.dialog
      .open<ReversalDialog, ReversalDialogData, boolean>(ReversalDialog, {
        data: { account, item },
        width: '500px',
        maxWidth: 'calc(100vw - 32px)',
        ariaLabelledBy: 'dialog-title',
      })
      .afterClosed()
      .subscribe((done) => {
        if (done) {
          this.afterAction('Estorno feito. O extrato e a auditoria já mostram a devolução.');
        }
      });
  }

  /** Depois de uma ação: saldo, status, extrato e trilha recarregados, e um aviso curto. */
  private afterAction(message: string): void {
    this.reload();
    this.statementTab()?.reload();
    this.auditTab()?.reload();
    this.snackBar.open(message, undefined, { duration: 4500 });
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
