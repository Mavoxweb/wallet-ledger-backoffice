import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AccountStatus } from '../../api';
import { DayPipe, MoneyPipe } from '../../shared/money.pipe';
import { StatusBadge } from '../../shared/status-badge';
import { AccountsStore } from './accounts.store';

interface StatusFilter {
  value: AccountStatus | null;
  label: string;
}

@Component({
  selector: 'wl-accounts-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, StatusBadge, MoneyPipe, DayPipe],
  templateUrl: './accounts.page.html',
  styleUrl: './accounts.page.scss',
})
export class AccountsPage implements OnInit {
  protected readonly store = inject(AccountsStore);

  protected readonly filters: StatusFilter[] = [
    { value: null, label: 'Todas' },
    { value: 'active', label: 'Ativas' },
    { value: 'blocked', label: 'Bloqueadas' },
  ];

  protected readonly summary = computed(() => {
    const count = this.store.items().length;
    const more = this.store.nextCursor() ? '+' : '';
    const noun = count === 1 && !more ? 'conta' : 'contas';
    const filtered = this.store.query().trim() || this.store.status();
    return `${count}${more} ${noun}${filtered ? ' encontradas' : ' de clientes'}`;
  });

  ngOnInit(): void {
    // Voltando do detalhe, a lista já carregada é mantida.
    if (!this.store.loaded()) {
      this.store.load();
    }
  }

  protected onInput(event: Event): void {
    this.store.search((event.target as HTMLInputElement).value);
  }
}
