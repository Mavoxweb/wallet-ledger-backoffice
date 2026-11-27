import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { AuditAction, BackofficeAuditService } from '../../api';
import { AuditFeed } from './audit-feed';
import { AuditTable } from './audit-table';

const FILTERS: { value: AuditAction | null; label: string }[] = [
  { value: null, label: 'Todas' },
  { value: 'accountBlocked', label: 'Bloqueios' },
  { value: 'accountUnblocked', label: 'Desbloqueios' },
  { value: 'transactionReversed', label: 'Estornos' },
];

@Component({
  selector: 'wl-audit-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AuditTable, RouterLink],
  templateUrl: './audit.page.html',
  styleUrl: './audit.page.scss',
})
export class AuditPage {
  private readonly route = inject(ActivatedRoute);

  protected readonly feed = new AuditFeed(inject(BackofficeAuditService));
  protected readonly filters = FILTERS;
  protected readonly action = signal<AuditAction | null>(null);

  /** `?conta=<id>`: chega aqui filtrada pela conta (link vindo do detalhe). */
  protected readonly accountId = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('conta'))),
    { initialValue: null },
  );

  constructor() {
    effect(() => {
      const filters = { accountId: this.accountId(), action: this.action() };
      untracked(() => this.feed.reset(filters));
    });
  }
}
