import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideApi } from '../../api';
import { detail, statementItem } from '../../../testing/api-fixtures';
import { renderDialog, typeInto } from '../../../testing/dialog';
import { ReversalDialog } from './reversal-dialog';

const URL = '/api/v1/backoffice/transactions/tx-10/reversal';
const REASON = 'Pix enviado por engano, confirmado com os dois.';

describe('ReversalDialog', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ReversalDialog],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApi(''),
        { provide: MAT_DIALOG_DATA, useValue: null },
        { provide: MatDialogRef, useValue: null },
      ],
    });
  });

  afterEach(() => http.verify());

  /** Monta o diálogo e só então pega o HTTP de teste (o TestBed não aceita override depois). */
  async function render(data: unknown) {
    const result = await renderDialog(ReversalDialog, data);
    http = TestBed.inject(HttpTestingController);
    return result;
  }

  async function open(item = statementItem()) {
    const result = await render({ account: detail(), item });
    typeInto(result.root, 'textarea', REASON);
    await result.fixture.whenStable();
    return result;
  }

  const confirm = (root: HTMLElement) => root.querySelector<HTMLButtonElement>('[data-confirm]')!;

  it('Pix recebido: a titular devolve para quem mandou', async () => {
    const { root } = await open(statementItem({ direction: 'in' }));

    expect(root.textContent).toContain('R$ 50,00');
    expect(root.textContent).toContain('Ana Beatriz Lima devolve para Bruno C. D.');
    expect(root.textContent).toContain('não pode ser desfeito');
    expect(confirm(root).textContent!.trim()).toBe('Estornar R$ 50,00');
  });

  it('Pix enviado: quem recebeu devolve para a titular', async () => {
    const { root } = await open(
      statementItem({ direction: 'out', counterpartyMaskedName: 'Carla M. R.' }),
    );

    expect(root.textContent).toContain('Carla M. R. devolve para Ana Beatriz Lima');
  });

  it('depósito: a titular devolve para a liquidação', async () => {
    const { root } = await open(
      statementItem({ type: 'deposit', counterpartyMaskedName: null, description: null }),
    );

    expect(root.textContent).toContain('Ana Beatriz Lima devolve o depósito');
    expect(root.textContent).toContain('Estornar este depósito?');
  });

  it('envia Idempotency-Key e reusa a mesma ao tentar de novo após erro de rede', async () => {
    const { fixture, root, close } = await open();

    confirm(root).click();
    const first = http.expectOne(URL);
    const key = first.request.headers.get('Idempotency-Key');
    expect(key).toMatch(/^[0-9a-f-]{36}$/);
    expect(first.request.body).toEqual({ reason: REASON });
    first.error(new ProgressEvent('error'));
    await fixture.whenStable();
    expect(root.querySelector('[role=alert]')!.textContent).toContain(
      'Não foi possível falar com o servidor.',
    );

    confirm(root).click();
    const retry = http.expectOne(URL);
    expect(retry.request.headers.get('Idempotency-Key')).toBe(key);
    retry.flush({
      reversalTransactionId: 'tx-11',
      originalTransactionId: 'tx-10',
      amountCents: 5000,
      createdAt: '2026-11-26T18:00:00Z',
    });
    await fixture.whenStable();

    expect(close).toHaveBeenCalledWith(true);
  });

  it('motivo diferente gera chave nova', async () => {
    const { fixture, root } = await open();
    confirm(root).click();
    const first = http.expectOne(URL);
    const key = first.request.headers.get('Idempotency-Key');
    first.error(new ProgressEvent('error'));
    await fixture.whenStable();

    typeInto(root, 'textarea', 'Outro motivo, mais detalhado.');
    await fixture.whenStable();
    confirm(root).click();

    expect(http.expectOne(URL).request.headers.get('Idempotency-Key')).not.toBe(key);
  });

  it('422 insufficient_funds mostra a mensagem específica e não fecha', async () => {
    const { fixture, root, close } = await open(
      statementItem({ direction: 'out', counterpartyMaskedName: 'Carla M. R.' }),
    );

    confirm(root).click();
    http
      .expectOne(URL)
      .flush({ code: 'insufficient_funds' }, { status: 422, statusText: 'Unprocessable' });
    await fixture.whenStable();

    expect(root.querySelector('[role=alert]')!.textContent).toContain('não tem saldo');
    expect(close).not.toHaveBeenCalled();
  });
});
