import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Tela entregue no próximo PR do backoffice. */
@Component({
  selector: 'wl-audit-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<h1 class="page-title">Auditoria</h1>',
})
export class AuditPage {}
