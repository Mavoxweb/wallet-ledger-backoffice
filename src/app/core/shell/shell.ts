import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SessionStore } from '../auth/session.store';
import { BrandMark } from '../ui/brand-mark';

/** Menu lateral escuro e área de conteúdo. No celular, o menu empilha no topo. */
@Component({
  selector: 'wl-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, BrandMark],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  protected readonly session = inject(SessionStore);
  protected readonly roleLabel = computed(() => (this.session.isAdmin() ? 'Admin' : 'Operador'));

  protected logout(): void {
    this.session.logout();
  }
}
