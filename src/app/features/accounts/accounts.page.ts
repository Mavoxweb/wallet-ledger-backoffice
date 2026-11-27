import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Tela entregue no próximo PR do backoffice. */
@Component({
  selector: 'wl-accounts-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<h1 class="page-title">Contas</h1>',
})
export class AccountsPage {}
