import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideApi } from '../../api';
import { fakeJwt } from '../../../testing/fake-jwt';
import { LoginPage } from './login.page';

describe('LoginPage', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideApi(''),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  async function submit(email: string, password = 'Demo@1234') {
    const fixture = TestBed.createComponent(LoginPage);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    const emailInput = root.querySelector<HTMLInputElement>('input[type=email]')!;
    const passwordInput = root.querySelector<HTMLInputElement>('input[type=password]')!;
    emailInput.value = email;
    emailInput.dispatchEvent(new Event('input'));
    passwordInput.value = password;
    passwordInput.dispatchEvent(new Event('input'));
    // Sem esperar aqui: o envio só termina depois que o teste responde o HTTP.
    root.querySelector<HTMLButtonElement>('button[type=submit]')!.click();
    return { fixture, root };
  }

  function tokens(role: string) {
    return {
      accessToken: fakeJwt({ role, name: 'Fulano', exp: 4102444800 }),
      refreshToken: 'rt',
      expiresIn: 900,
    };
  }

  it('cliente vê que o acesso é só para a equipe de operação', async () => {
    const { fixture, root } = await submit('ana@walletledger.dev');
    http.expectOne('/api/v1/auth/login').flush(tokens('Customer'));
    await fixture.whenStable();
    http.expectOne('/api/v1/auth/logout').flush(null);
    await fixture.whenStable();

    expect(root.querySelector('[role=alert]')?.textContent).toContain(
      'Este acesso é só para a equipe de operação.',
    );
  });

  it('senha errada mostra mensagem sem dizer qual campo errou', async () => {
    const { fixture, root } = await submit('operador@walletledger.dev', 'errada');
    http
      .expectOne('/api/v1/auth/login')
      .flush({ code: 'invalid_credentials' }, { status: 401, statusText: 'Unauthorized' });
    await fixture.whenStable();

    expect(root.querySelector('[role=alert]')?.textContent).toContain(
      'E-mail ou senha incorretos.',
    );
  });

  it('sem conexão, avisa que não conseguiu falar com o servidor', async () => {
    const { fixture, root } = await submit('operador@walletledger.dev');
    http.expectOne('/api/v1/auth/login').error(new ProgressEvent('error'));
    await fixture.whenStable();

    expect(root.querySelector('[role=alert]')?.textContent).toContain(
      'Não foi possível falar com o servidor.',
    );
  });

  it('operador entra e vai para /contas', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const { fixture } = await submit('operador@walletledger.dev');
    http.expectOne('/api/v1/auth/login').flush(tokens('Operator'));
    await fixture.whenStable();

    expect(navigate).toHaveBeenCalledWith('/contas');
  });

  it('não envia com campos vazios', async () => {
    const { fixture, root } = await submit('', '');
    await fixture.whenStable();

    http.expectNone('/api/v1/auth/login');
    expect(root.querySelector('[role=alert]')?.textContent).toContain(
      'Informe o e-mail e a senha.',
    );
  });
});
