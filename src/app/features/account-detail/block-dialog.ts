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
import { BackofficeAccountDetail, BackofficeAccountsService } from '../../api';
import { messageForError } from '../../core/errors/error-messages';
import { formatCents } from '../../core/format/format';
import { isValidReason, ReasonField } from '../../shared/reason-field';

export interface BlockDialogData {
  account: BackofficeAccountDetail;
  mode: 'block' | 'unblock';
}

/** Bloquear ou desbloquear. Fecha com `true` quando a API confirmou. */
@Component({
  selector: 'wl-block-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReasonField],
  template: `
    <h2 id="dialog-title">{{ title() }}</h2>
    <p class="body">{{ body() }}</p>
    <wl-reason-field [(value)]="reason" [placeholder]="placeholder()" [disabled]="busy()" />
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
        class="btn"
        [class.warn]="isBlock"
        [class.primary]="!isBlock"
        [disabled]="!canConfirm()"
        (click)="confirm()"
      >
        {{ isBlock ? 'Bloquear conta' : 'Desbloquear conta' }}
      </button>
    </div>
  `,
  styleUrl: './action-dialog.scss',
})
export class BlockDialog {
  private readonly data = inject<BlockDialogData>(MAT_DIALOG_DATA);
  private readonly api = inject(BackofficeAccountsService);
  private readonly pendingTasks = inject(PendingTasks);
  protected readonly ref = inject<MatDialogRef<BlockDialog, boolean>>(MatDialogRef);

  protected readonly isBlock = this.data.mode === 'block';
  protected readonly reason = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly canConfirm = computed(() => isValidReason(this.reason()) && !this.busy());

  private readonly firstName = this.data.account.holderName.split(' ')[0];

  protected readonly title = computed(() =>
    this.isBlock
      ? `Bloquear a conta de ${this.firstName}?`
      : `Desbloquear a conta de ${this.firstName}?`,
  );
  protected readonly body = computed(() =>
    this.isBlock
      ? `${this.data.account.holderName} não vai conseguir enviar nem receber Pix, inclusive no app que já está aberto. O saldo de ${formatCents(this.data.account.balanceCents)} continua guardado.`
      : 'A conta volta a enviar e receber Pix na hora.',
  );
  protected readonly placeholder = computed(() =>
    this.isBlock
      ? 'Ex.: cliente relatou acesso de terceiros ao celular.'
      : 'Ex.: identidade confirmada por telefone.',
  );

  protected confirm(): void {
    if (!this.canConfirm()) {
      return;
    }
    this.pendingTasks.run(() => this.send());
  }

  private async send(): Promise<void> {
    const id = this.data.account.accountId;
    const body = { reason: this.reason().trim() };
    this.busy.set(true);
    this.error.set('');
    try {
      await firstValueFrom(
        this.isBlock
          ? this.api.apiV1BackofficeAccountsIdBlockPost(id, body)
          : this.api.apiV1BackofficeAccountsIdUnblockPost(id, body),
      );
      this.ref.close(true);
    } catch (error: unknown) {
      this.error.set(messageForError(error));
    } finally {
      this.busy.set(false);
    }
  }
}
