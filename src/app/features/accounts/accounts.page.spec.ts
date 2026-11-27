import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideApi } from '../../api';
import { summary } from '../../../testing/api-fixtures';
import { AccountsPage } from './accounts.page';

const URL = '/api/v1/backoffice/accounts';

describe('AccountsPage', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AccountsPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideApi(''),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  async function render(items = [summary()], nextCursor: string | null = null) {
    const fixture = TestBed.createComponent(AccountsPage);
    fixture.detectChanges();
    http.expectOne((r) => r.url === URL).flush({ items, nextCursor });
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('mostra titular, final da conta, saldo formatado e link para o detalhe', async () => {
    const root = await render();

    const row = root.querySelector('tbody tr')!;
    expect(row.textContent).toContain('Ana Beatriz Lima');
    expect(row.textContent).toContain('•••• 3822');
    expect(row.textContent).toContain('R$ 2.395,00');
    expect(row.querySelector('a')!.getAttribute('href')).toBe(
      '/contas/0193f1c2-0000-7000-8000-000000003822',
    );
  });

  it('status tem rótulo em texto, não só cor', async () => {
    const root = await render([summary({ status: 'blocked' })]);

    expect(root.querySelector('tbody wl-status-badge')!.textContent!.trim()).toBe('Bloqueada');
  });

  it('a tabela tem cabeçalhos de coluna', async () => {
    const root = await render();

    const headers = [...root.querySelectorAll('thead th')].map((th) => th.textContent!.trim());
    expect(headers).toEqual(['Titular', 'Conta', 'Status', 'Saldo', 'Abertura']);
    expect(root.querySelector('thead th')!.getAttribute('scope')).toBe('col');
  });

  it('lista vazia explica o que fazer', async () => {
    const root = await render([]);

    expect(root.textContent).toContain('Nenhuma conta encontrada para essa busca.');
  });

  it('"Carregar mais" só aparece quando há próxima página', async () => {
    const withMore = await render([summary()], 'c1');
    expect(withMore.textContent).toContain('Carregar mais');
  });
});
