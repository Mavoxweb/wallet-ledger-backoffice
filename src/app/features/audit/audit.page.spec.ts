import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuditItem, provideApi } from '../../api';
import { AuditPage } from './audit.page';

const URL = '/api/v1/backoffice/audit';

function entry(overrides: Partial<AuditItem> = {}): AuditItem {
  return {
    id: 'au1',
    at: '2026-11-26T18:00:00Z',
    actorId: 'u-admin',
    actorName: 'Admin Demo',
    actorRole: 'admin',
    action: 'transactionReversed',
    accountId: 'acc-1',
    accountNumber: '3822',
    transactionId: 'tx-10',
    reason: 'Pix enviado por engano, confirmado com os dois.',
    details: { amountCents: 5000 },
    ...overrides,
  };
}

describe('AuditPage', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApi(''),
        provideRouter([
          { path: 'auditoria', component: AuditPage },
          { path: 'contas/:id', component: AuditPage },
        ]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  async function open(url = '/auditoria') {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    return harness;
  }

  it('item mostra quando, ação, quem, conta, motivo e valor', async () => {
    const harness = await open();
    http.expectOne((r) => r.url === URL).flush({ items: [entry()], nextCursor: null });
    await harness.fixture.whenStable();

    const row = harness.routeNativeElement!.querySelector('tbody tr')!;
    const text = row.textContent!;
    expect(text).toContain('26/11/2026 15:00');
    expect(text).toContain('Estorno');
    expect(text).toContain('Admin Demo');
    expect(text).toContain('Admin');
    expect(text).toContain('•••• 3822');
    expect(text).toContain('Pix enviado por engano');
    expect(text).toContain('R$ 50,00');
  });

  it('bloqueio mostra a mudança de status', async () => {
    const harness = await open();
    http
      .expectOne((r) => r.url === URL)
      .flush({
        items: [
          entry({
            action: 'accountBlocked',
            actorName: 'Operador Demo',
            actorRole: 'operator',
            transactionId: null,
            details: { previousStatus: 'active', newStatus: 'blocked' },
          }),
        ],
        nextCursor: null,
      });
    await harness.fixture.whenStable();

    const text = harness.routeNativeElement!.querySelector('tbody tr')!.textContent!;
    expect(text).toContain('Bloqueio');
    expect(text).toContain('Operador');
    expect(text).toContain('Ativa → Bloqueada');
  });

  it('filtro por ação altera a requisição', async () => {
    const harness = await open();
    http.expectOne((r) => r.url === URL).flush({ items: [], nextCursor: null });
    await harness.fixture.whenStable();

    const chip = [...harness.routeNativeElement!.querySelectorAll<HTMLButtonElement>('.chip')].find(
      (b) => b.textContent!.trim() === 'Estornos',
    )!;
    chip.click();
    await harness.fixture.whenStable();

    const req = http.expectOne((r) => r.url === URL);
    expect(req.request.params.get('action')).toBe('transactionReversed');
    req.flush({ items: [], nextCursor: null });
  });

  it('filtro por conta vem da URL e vai para a requisição', async () => {
    const harness = await open('/auditoria?conta=acc-9');

    const req = http.expectOne((r) => r.url === URL);
    expect(req.request.params.get('accountId')).toBe('acc-9');
    req.flush({ items: [], nextCursor: null });
    await harness.fixture.whenStable();

    expect(harness.routeNativeElement!.textContent).toContain('Só uma conta');
  });

  it('vazio explica o que aparece aqui', async () => {
    const harness = await open();
    http.expectOne((r) => r.url === URL).flush({ items: [], nextCursor: null });
    await harness.fixture.whenStable();

    expect(harness.routeNativeElement!.textContent).toContain('Nenhuma ação registrada');
  });
});
