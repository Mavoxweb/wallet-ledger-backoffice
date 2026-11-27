import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideApi } from '../../api';
import { detail, statementItem } from '../../../testing/api-fixtures';
import { AccountDetailPage } from './account-detail.page';

const ID = '0193f1c2-0000-7000-8000-000000003822';
const DETAIL = `/api/v1/backoffice/accounts/${ID}`;
const STATEMENT = `${DETAIL}/statement`;

describe('AccountDetailPage', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApi(''),
        provideRouter([{ path: 'contas/:id', component: AccountDetailPage }]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  async function open(url: string) {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    return harness;
  }

  it('mostra titular, CPF mascarado, final da conta e saldo', async () => {
    const harness = await open(`/contas/${ID}`);
    http.expectOne(DETAIL).flush(detail());
    await harness.fixture.whenStable();
    http
      .expectOne((r) => r.url === STATEMENT)
      .flush({ items: [statementItem()], nextCursor: null });
    await harness.fixture.whenStable();

    const text = harness.routeNativeElement!.textContent!;
    expect(text).toContain('Ana Beatriz Lima');
    expect(text).toContain('***.982.247-**');
    expect(text).toContain('•••• 3822');
    expect(text).toContain('R$ 2.395,00');
    expect(text).not.toContain('529.982.247-25');
  });

  it('abre na aba que veio na URL', async () => {
    const harness = await open(`/contas/${ID}?aba=chaves`);
    http.expectOne(DETAIL).flush(detail());
    await harness.fixture.whenStable();

    const root = harness.routeNativeElement!;
    const selected = root.querySelector('[role=tab][aria-selected=true]')!;
    expect(selected.textContent!.trim()).toBe('Chaves Pix');
    expect(root.textContent).toContain('c9a1f6e2-4b7d-4e0a-9d3f-1b2c7a8e5f40');
    http.expectNone((r) => r.url === STATEMENT);
  });

  it('conta inexistente mostra "Conta não encontrada."', async () => {
    const harness = await open(`/contas/${ID}`);
    http
      .expectOne(DETAIL)
      .flush({ code: 'not_found', title: 'x' }, { status: 404, statusText: 'Not Found' });
    await harness.fixture.whenStable();

    expect(harness.routeNativeElement!.textContent).toContain('Conta não encontrada.');
  });

  it('conta bloqueada mostra o aviso', async () => {
    const harness = await open(`/contas/${ID}?aba=chaves`);
    http.expectOne(DETAIL).flush(detail({ status: 'blocked' }));
    await harness.fixture.whenStable();

    expect(harness.routeNativeElement!.textContent).toContain('Conta bloqueada');
  });
});
