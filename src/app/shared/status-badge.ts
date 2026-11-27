import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type BadgeKind =
  'active' | 'blocked' | 'closed' | 'completed' | 'reversed' | 'reversal' | 'unblocked';

const LABELS: Record<BadgeKind, string> = {
  active: 'Ativa',
  blocked: 'Bloqueada',
  closed: 'Encerrada',
  completed: 'Concluída',
  reversed: 'Estornada',
  reversal: 'Estorno',
  unblocked: 'Desbloqueio',
};

/**
 * Selo de status. O texto sempre diz o estado: a cor ajuda, mas não é a única
 * pista (daltonismo, leitor de tela, impressão em preto e branco).
 */
@Component({
  selector: 'wl-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'kind()' },
  template: `@if (dot()) {
      <span class="dot" aria-hidden="true"></span>
    }
    {{ text() }}`,
  styleUrl: './status-badge.scss',
})
export class StatusBadge {
  readonly kind = input.required<BadgeKind>();
  /** Texto próprio no lugar do rótulo padrão (ex.: "Bloqueio" na auditoria). */
  readonly label = input<string>();
  readonly dot = input(false);

  protected readonly text = computed(() => this.label() ?? LABELS[this.kind()]);
}
