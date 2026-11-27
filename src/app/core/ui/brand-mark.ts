import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** O símbolo do Wallet Ledger: três linhas de razão num quadrado arredondado. */
@Component({
  selector: 'wl-brand-mark',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 36 36" aria-hidden="true">
      <rect width="36" height="36" rx="9" [attr.fill]="inverted() ? '#7FD3BF' : '#0F1413'" />
      <path
        d="M10 13h16M10 18h11M10 23h16"
        [attr.stroke]="inverted() ? '#0F1413' : '#7FD3BF'"
        stroke-width="2.5"
        stroke-linecap="round"
      />
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
    }
  `,
})
export class BrandMark {
  readonly size = input(36);
  /** Menta com linhas escuras, para fundos escuros. */
  readonly inverted = input(false);
}
