import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Tela entregue no próximo PR do backoffice. */
@Component({
  selector: 'wl-account-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<h1 class="page-title">Conta</h1>',
})
export class AccountDetailPage {}
