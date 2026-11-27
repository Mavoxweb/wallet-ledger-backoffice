import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  PendingTasks,
  signal,
} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import {
  BackofficeAccountDetail,
  BackofficeStatementItem,
  BackofficeTransactionsService,
} from '../../api';
import { messageForError } from '../../core/errors/error-messages';
import { formatCents, formatDateTime } from '../../core/format/format';
import { isValidReason, ReasonField } from '../../shared/reason-field';

export interface ReversalDialogData {
  account: BackofficeAccountDetail;
  item: BackofficeStatementItem;
}

/** Quem devolve para quem, do ponto de vista da conta aberta. */
export function reversalFlow(holderName: string, item: BackofficeStatementItem): string {
  const other = item.counterpartyMaskedName;
  if (!other) {
    return `${holderName} devolve o depósito`;
  }
  return item.direction === 'in'
    ? `${holderName} devolve para ${other}`
    : `${other} devolve para ${holderName}`;
}

/**
 * Estorno (só admin). A chave de idempotência nasce no primeiro "Estornar" e é
 * reusada se a pessoa tentar de novo com o mesmo motivo depois de um erro de
 * rede: se o primeiro pedido chegou, a API devolve a mesma resposta em vez de
 * estornar de novo. Motivo diferente é outro pedido, e ganha chave nova.
 */
@Component({
  selector: 'wl-reversal-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReasonField],
  template: `
    <h2 id="dialog-title">{{ isDeposit ? 'Estornar este depósito?' : 'Estornar este Pix?' }}</h2>
    <p class="body">O estorno lança o valor de volta. Quem devolve precisa ter saldo.</p>
    <div class="summary">
      <span class="label">{{ label }}</span>
      <span class="num amount">{{ amount }}</span>
      <span>{{ flow }}</span>
    </div>
    <p class="warning">
      O estorno não pode ser desfeito. A transação original fica marcada como estornada no extrato.
    </p>
    <wl-reason-field
      [(value)]="reason"
      placeholder="Ex.: Pix enviado por engano, confirmado com os dois clientes."
      [disabled]="busy()"
    />
    @if (error()) {
      <p class="alert" role="alert">{{ error() }}</p>
    }
    <div class="actions">
      <button type="button" class="btn ghost" [disabled]="busy()" (click)="ref.close(false)">
        Cancelar
      </button>
      <button
        type="button"
        data-confirm
        class="btn primary"
        [disabled]="!canConfirm()"
        (click)="confirm()"
      >
        Estornar {{ amount }}
      </button>
    </div>
  `,
  styleUrls: ['./action-dialog.scss', './reversal-dialog.scss'],
})
export class ReversalDialog {
  private readonly data = inject<ReversalDialogData>(MAT_DIALOG_DATA);
  private readonly api = inject(BackofficeTransactionsService);
  private readonly pendingTasks = inject(PendingTasks);
  protected readonly ref = inject<MatDialogRef<ReversalDialog, boolean>>(MatDialogRef);

  protected readonly isDeposit = this.data.item.type === 'deposit';
  protected readonly amount = formatCents(this.data.item.amountCents);
  protected readonly flow = reversalFlow(this.data.account.holderName, this.data.item);
  protected readonly label = [
    this.isDeposit ? 'Depósito' : 'Pix',
    'de',
    formatDateTime(this.data.item.createdAt),
    this.data.item.description ? `· ${this.data.item.description}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  protected readonly reason = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly canConfirm = computed(() => isValidReason(this.reason()) && !this.busy());

  private attempt: { reason: string; key: string } | null = null;

  protected confirm(): void {
    if (!this.canConfirm()) {
      return;
    }
    this.pendingTasks.run(() => this.send());
  }

  private keyFor(reason: string): string {
    if (this.attempt?.reason !== reason) {
      this.attempt = { reason, key: crypto.randomUUID() };
    }
    return this.attempt.key;
  }

  private async send(): Promise<void> {
    const reason = this.reason().trim();
    const key = this.keyFor(reason);
    this.busy.set(true);
    this.error.set('');
    try {
      await firstValueFrom(
        this.api.apiV1BackofficeTransactionsIdReversalPost(this.data.item.transactionId, key, {
          reason,
        }),
      );
      this.ref.close(true);
    } catch (error: unknown) {
      this.error.set(messageForError(error));
    } finally {
      this.busy.set(false);
    }
  }
}
