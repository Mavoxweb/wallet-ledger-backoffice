import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideApi } from '../../api';
import { statementItem } from '../../../testing/api-fixtures';
import { StatementTab } from './statement-tab';

const URL = '/api/v1/backoffice/accounts/acc-1/statement';

describe('StatementTab', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [StatementTab],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideApi('')],
    });
    http = TestBed.inject(HttpTestingController);
  });

  async function render(
    items: ReturnType<typeof statementItem>[],
    nextCursor: string | null = null,
  ) {
    const fixture = TestBed.createComponent(StatementTab);
    fixture.componentRef.setInput('accountId', 'acc-1');
    fixture.detectChanges();
    http.expectOne((r) => r.url === URL).flush({ items, nextCursor });
    await fixture.whenStable();
    return { fixture, root: fixture.nativeElement as HTMLElement };
  }

  it('entrada tem "+" e cor de entrada; saída tem "−"', async () => {
    const { root } = await render([
      statementItem({ postingId: 2, direction: 'in', amountCents: 5000 }),
      statementItem({
        postingId: 1,
        direction: 'out',
        amountCents: 12000,
        counterpartyMaskedName: 'Carla M. R.',
      }),
    ]);

    const amounts = [...root.querySelectorAll('[data-amount]')];
    expect(amounts[0].textContent!.trim()).toBe('+ R$ 50,00');
    expect(amounts[0].classList).toContain('in');
    expect(amounts[1].textContent!.trim()).toBe('− R$ 120,00');
    expect(amounts[1].classList).not.toContain('in');
  });

  it('títulos dizem o movimento e com quem', async () => {
    const { root } = await render([
      statementItem({ postingId: 3, direction: 'in' }),
      statementItem({ postingId: 2, direction: 'out', counterpartyMaskedName: 'Carla M. R.' }),
      statementItem({
        postingId: 1,
        type: 'deposit',
        counterpartyMaskedName: null,
        description: 'Depósito simulado',
      }),
    ]);

    const titles = [...root.querySelectorAll('[data-title]')].map((e) => e.textContent!.trim());
    expect(titles).toEqual([
      'Pix recebido de Bruno C. D.',
      'Pix enviado para Carla M. R.',
      'Depósito',
    ]);
  });

  it('item estornado tem o rótulo "Estornada"', async () => {
    const { root } = await render([statementItem({ status: 'reversed', reversible: false })]);

    expect(root.querySelector('tbody wl-status-badge')!.textContent!.trim()).toBe('Estornada');
  });

  it('mostra data e hora de Brasília', async () => {
    const { root } = await render([statementItem({ createdAt: '2026-11-26T17:32:00Z' })]);

    expect(root.querySelector('tbody td')!.textContent).toContain('26/11/2026 14:32');
  });

  it('sem movimentos, diz isso', async () => {
    const { root } = await render([]);

    expect(root.textContent).toContain('Nenhum movimento nesta conta.');
  });

  it('"Carregar mais" pede a próxima página e acrescenta', async () => {
    const { fixture, root } = await render([statementItem({ postingId: 2 })], 'c1');

    root.querySelector<HTMLButtonElement>('[data-load-more]')!.click();
    const more = http.expectOne((r) => r.url === URL);
    expect(more.request.params.get('cursor')).toBe('c1');
    more.flush({ items: [statementItem({ postingId: 1 })], nextCursor: null });
    await fixture.whenStable();

    expect(root.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(root.querySelector('[data-load-more]')).toBeNull();
  });
});
