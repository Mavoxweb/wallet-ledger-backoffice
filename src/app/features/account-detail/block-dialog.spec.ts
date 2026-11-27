import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideApi } from '../../api';
import { detail } from '../../../testing/api-fixtures';
import { renderDialog, typeInto } from '../../../testing/dialog';
import { BlockDialog } from './block-dialog';

const ID = '0193f1c2-0000-7000-8000-000000003822';

describe('BlockDialog', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [BlockDialog],
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
    const result = await renderDialog(BlockDialog, data);
    http = TestBed.inject(HttpTestingController);
    return result;
  }

  const confirmButton = (root: HTMLElement) =>
    root.querySelector<HTMLButtonElement>('[data-confirm]')!;

  it('diz a consequência e nomeia a ação', async () => {
    const { root } = await render({ account: detail(), mode: 'block' });

    expect(root.textContent).toContain('Bloquear a conta de Ana?');
    expect(root.textContent).toContain('Ana Beatriz Lima não vai conseguir enviar nem receber Pix');
    expect(root.textContent).toContain('R$ 2.395,00 continua guardado');
    expect(confirmButton(root).textContent!.trim()).toBe('Bloquear conta');
  });

  it('o botão fica desligado com motivo de menos de 10 caracteres', async () => {
    const { fixture, root } = await render({ account: detail(), mode: 'block' });

    typeInto(root, 'textarea', '  curto   ');
    await fixture.whenStable();
    expect(confirmButton(root).disabled).toBe(true);

    typeInto(root, 'textarea', 'Cliente relatou golpe.');
    await fixture.whenStable();
    expect(confirmButton(root).disabled).toBe(false);
  });

  it('bloqueia com o motivo sem espaços nas pontas e fecha com true', async () => {
    const { fixture, root, close } = await render({
      account: detail(),
      mode: 'block',
    });
    typeInto(root, 'textarea', '  Cliente relatou golpe.  ');
    await fixture.whenStable();

    confirmButton(root).click();
    const req = http.expectOne(`/api/v1/backoffice/accounts/${ID}/block`);
    expect(req.request.body).toEqual({ reason: 'Cliente relatou golpe.' });
    req.flush(detail({ status: 'blocked' }));
    await fixture.whenStable();

    expect(close).toHaveBeenCalledWith(true);
  });

  it('desbloqueio usa a rota e o texto próprios', async () => {
    const { fixture, root, close } = await render({
      account: detail({ status: 'blocked' }),
      mode: 'unblock',
    });
    expect(root.textContent).toContain('Desbloquear a conta de Ana?');
    expect(confirmButton(root).textContent!.trim()).toBe('Desbloquear conta');

    typeInto(root, 'textarea', 'Identidade confirmada por telefone.');
    await fixture.whenStable();
    confirmButton(root).click();
    http.expectOne(`/api/v1/backoffice/accounts/${ID}/unblock`).flush(detail());
    await fixture.whenStable();

    expect(close).toHaveBeenCalledWith(true);
  });

  it('409 mostra a mensagem e não fecha', async () => {
    const { fixture, root, close } = await render({
      account: detail(),
      mode: 'block',
    });
    typeInto(root, 'textarea', 'Cliente relatou golpe.');
    await fixture.whenStable();

    confirmButton(root).click();
    http
      .expectOne(`/api/v1/backoffice/accounts/${ID}/block`)
      .flush({ code: 'account_already_blocked' }, { status: 409, statusText: 'Conflict' });
    await fixture.whenStable();

    expect(root.querySelector('[role=alert]')!.textContent).toContain('já está bloqueada');
    expect(close).not.toHaveBeenCalled();
  });
});
