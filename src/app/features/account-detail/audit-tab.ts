import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  untracked,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { BackofficeAuditService } from '../../api';
import { AuditFeed } from '../audit/audit-feed';
import { AuditTable } from '../audit/audit-table';

/** As ações da operação nesta conta. */
@Component({
  selector: 'wl-audit-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AuditTable, RouterLink],
  template: `
    @if (feed.error()) {
      <p class="error" role="alert">{{ feed.error() }}</p>
    }
    @if (feed.loaded() && feed.items().length === 0) {
      <div class="empty">
        <p class="empty-title">Nenhuma ação registrada nesta conta.</p>
        <p class="muted">
          Bloqueios, desbloqueios e estornos aparecem aqui com quem fez e o motivo.
        </p>
      </div>
    } @else {
      <wl-audit-table [items]="feed.items()" [showAccount]="false" />
    }
    <div class="footer">
      <a routerLink="/auditoria" [queryParams]="{ conta: accountId() }">Ver na auditoria geral</a>
      @if (feed.nextCursor()) {
        <button type="button" class="more" [disabled]="feed.loading()" (click)="feed.loadMore()">
          Carregar mais
        </button>
      }
    </div>
  `,
  styleUrl: './audit-tab.scss',
})
export class AuditTab {
  readonly accountId = input.required<string>();

  protected readonly feed = new AuditFeed(inject(BackofficeAuditService));

  constructor() {
    effect(() => {
      const accountId = this.accountId();
      untracked(() => this.feed.reset({ accountId }));
    });
  }

  reload(): void {
    this.feed.reset({ accountId: this.accountId() });
  }
}
