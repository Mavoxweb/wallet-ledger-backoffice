import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuditAction, AuditItem, Role } from '../../api';
import { formatCents } from '../../core/format/format';
import { DateTimePipe } from '../../shared/money.pipe';
import { BadgeKind, StatusBadge } from '../../shared/status-badge';

const ACTIONS: Record<AuditAction, { kind: BadgeKind; label: string }> = {
  accountBlocked: { kind: 'blocked', label: 'Bloqueio' },
  accountUnblocked: { kind: 'unblocked', label: 'Desbloqueio' },
  transactionReversed: { kind: 'reversal', label: 'Estorno' },
};

const ROLES: Record<Role, string> = { customer: 'Cliente', operator: 'Operador', admin: 'Admin' };

const STATUS: Record<string, string> = {
  active: 'Ativa',
  blocked: 'Bloqueada',
  closed: 'Encerrada',
};

/** O que mudou, em uma linha: "Ativa → Bloqueada" ou "R$ 50,00 estornados". */
export function auditDetail(item: AuditItem): string {
  const details = (item.details ?? {}) as Record<string, unknown>;
  if (item.action === 'transactionReversed' && typeof details['amountCents'] === 'number') {
    return `${formatCents(details['amountCents'])} estornados`;
  }
  const from = STATUS[String(details['previousStatus'])];
  const to = STATUS[String(details['newStatus'])];
  return from && to ? `${from} → ${to}` : '';
}

@Component({
  selector: 'wl-audit-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, StatusBadge, DateTimePipe],
  templateUrl: './audit-table.html',
  styleUrl: './audit-table.scss',
})
export class AuditTable {
  readonly items = input.required<AuditItem[]>();
  /** A aba da conta já está na conta: lá a coluna "Conta" sai. */
  readonly showAccount = input(true);

  protected readonly actions = ACTIONS;
  protected readonly roles = ROLES;
  protected readonly detail = auditDetail;
}
