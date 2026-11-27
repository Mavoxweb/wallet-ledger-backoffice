import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';

export const REASON_MIN = 10;
export const REASON_MAX = 500;

/** O motivo conta depois de tirar os espaços das pontas, como a API valida. */
export function isValidReason(reason: string): boolean {
  const length = reason.trim().length;
  return length >= REASON_MIN && length <= REASON_MAX;
}

/** Campo de motivo dos diálogos: vai para a auditoria, com contagem visível. */
@Component({
  selector: 'wl-reason-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label for="motivo"> Motivo <span class="hint">(vai para a auditoria)</span> </label>
    <textarea
      id="motivo"
      [attr.maxlength]="max"
      [placeholder]="placeholder()"
      [value]="value()"
      [disabled]="disabled()"
      (input)="value.set($any($event.target).value)"
      aria-describedby="motivo-ajuda"
    ></textarea>
    <span id="motivo-ajuda" class="count">{{ help() }}</span>
  `,
  styleUrl: './reason-field.scss',
})
export class ReasonField {
  readonly value = model('');
  readonly placeholder = input('');
  readonly disabled = input(false);

  protected readonly max = REASON_MAX;
  protected readonly help = computed(() => {
    const length = this.value().trim().length;
    return length < REASON_MIN
      ? `Mínimo de ${REASON_MIN} caracteres (${length}/${REASON_MIN}).`
      : `${length}/${REASON_MAX} caracteres.`;
  });
}
