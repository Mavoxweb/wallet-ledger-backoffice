import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideApi } from '../../api';
import { fakeJwt } from '../../../testing/fake-jwt';
import { SessionStore, StaffOnlyError } from './session.store';
import { TokenStorage } from './token.storage';

describe('SessionStore', () => {
  let http: HttpTestingController;
  let store: SessionStore;
  let storage: TokenStorage;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideApi(''),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    store = TestBed.inject(SessionStore);
    storage = TestBed.inject(TokenStorage);
  });

  afterEach(() => http.verify());

  function answerLogin(role: string) {
    http.expectOne('/api/v1/auth/login').flush({
      accessToken: fakeJwt({ role, name: 'Fulano', exp: 4102444800 }),
      refreshToken: 'rt-1',
      expiresIn: 900,
    });
  }

  it('operador entra e a sessão guarda o perfil', async () => {
    const login = store.login('operador@walletledger.dev', 'Demo@1234');
    answerLogin('Operator');
    await login;

    expect(store.role()).toBe('Operator');
    expect(store.isAdmin()).toBe(false);
    expect(storage.read()?.refreshToken).toBe('rt-1');
  });

  it('admin entra com isAdmin verdadeiro', async () => {
    const login = store.login('admin@walletledger.dev', 'Demo@1234');
    answerLogin('Admin');
    await login;

    expect(store.isAdmin()).toBe(true);
  });

  it('cliente recebe StaffOnlyError, nada é salvo e o refresh token é revogado', async () => {
    const login = store.login('ana@walletledger.dev', 'Demo@1234');
    answerLogin('Customer');

    await expect(login).rejects.toBeInstanceOf(StaffOnlyError);
    expect(store.role()).toBeNull();
    expect(storage.read()).toBeNull();
    http.expectOne('/api/v1/auth/logout').flush(null);
  });

  it('logout limpa a sessão e revoga o refresh token', async () => {
    const login = store.login('operador@walletledger.dev', 'Demo@1234');
    answerLogin('Operator');
    await login;

    store.logout();

    const revoke = http.expectOne('/api/v1/auth/logout');
    expect(revoke.request.body).toEqual({ refreshToken: 'rt-1' });
    revoke.flush(null);
    expect(store.role()).toBeNull();
    expect(storage.read()).toBeNull();
  });
});
