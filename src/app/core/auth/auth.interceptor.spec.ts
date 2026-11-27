import {
  HttpClient,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { provideApi } from '../../api';
import { fakeJwt } from '../../../testing/fake-jwt';
import { authInterceptor } from './auth.interceptor';
import { SessionStore } from './session.store';
import { TokenStorage } from './token.storage';

describe('authInterceptor', () => {
  let http: HttpTestingController;
  let client: HttpClient;
  let store: SessionStore;
  let storage: TokenStorage;
  const oldToken = fakeJwt({ role: 'Operator', name: 'Operador Demo', exp: 4102444800 });
  const newToken = fakeJwt({ role: 'Operator', name: 'Operador Demo', exp: 4102444900 });
  const unauthorized = { status: 401, statusText: 'Unauthorized' };

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        provideApi(''),
      ],
    });
    storage = TestBed.inject(TokenStorage);
    storage.write({ accessToken: oldToken, refreshToken: 'rt-1' });
    http = TestBed.inject(HttpTestingController);
    client = TestBed.inject(HttpClient);
    store = TestBed.inject(SessionStore);
  });

  afterEach(() => http.verify());

  it('anexa o access token', () => {
    client.get('/api/v1/backoffice/accounts').subscribe();

    const req = http.expectOne('/api/v1/backoffice/accounts');
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${oldToken}`);
    req.flush({ items: [], nextCursor: null });
  });

  it('três 401 simultâneos fazem uma única renovação e as três repetem com o token novo', async () => {
    const urls = ['/api/v1/a', '/api/v1/b', '/api/v1/c'];
    const results = urls.map((url) => firstValueFrom(client.get(url)));

    for (const url of urls) {
      http.expectOne(url).flush(null, unauthorized);
    }
    const refresh = http.expectOne('/api/v1/auth/refresh');
    expect(refresh.request.body).toEqual({ refreshToken: 'rt-1' });
    refresh.flush({ accessToken: newToken, refreshToken: 'rt-2', expiresIn: 900 });

    for (const url of urls) {
      const retry = http.expectOne(url);
      expect(retry.request.headers.get('Authorization')).toBe(`Bearer ${newToken}`);
      retry.flush({ ok: url });
    }

    expect(await Promise.all(results)).toEqual(urls.map((url) => ({ ok: url })));
    expect(storage.read()?.refreshToken).toBe('rt-2');
  });

  it('renovação com erro de rede mantém a sessão e repassa o erro de rede', async () => {
    const result = firstValueFrom(client.get('/api/v1/a'));
    http.expectOne('/api/v1/a').flush(null, unauthorized);
    http.expectOne('/api/v1/auth/refresh').error(new ProgressEvent('error'));

    const error = await result.catch((e: unknown) => e);
    expect(error).toBeInstanceOf(HttpErrorResponse);
    expect((error as HttpErrorResponse).status).toBe(0);
    expect(store.role()).toBe('Operator');
    expect(storage.read()?.refreshToken).toBe('rt-1');
  });

  it('renovação com 5xx mantém a sessão', async () => {
    const result = firstValueFrom(client.get('/api/v1/a'));
    http.expectOne('/api/v1/a').flush(null, unauthorized);
    http.expectOne('/api/v1/auth/refresh').flush(null, { status: 503, statusText: 'Unavailable' });

    await result.catch(() => undefined);
    expect(store.role()).toBe('Operator');
  });

  it('renovação recusada (401) encerra a sessão e leva ao login', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const result = firstValueFrom(client.get('/api/v1/a'));
    http.expectOne('/api/v1/a').flush(null, unauthorized);
    http.expectOne('/api/v1/auth/refresh').flush(null, unauthorized);

    const error = await result.catch((e: unknown) => e);
    expect((error as HttpErrorResponse).status).toBe(401);
    expect(store.role()).toBeNull();
    expect(storage.read()).toBeNull();
    expect(navigate).toHaveBeenCalledWith('/login');
  });

  it('não tenta renovar quando o próprio login dá 401', async () => {
    store.clear();
    const result = firstValueFrom(client.post('/api/v1/auth/login', {}));
    http.expectOne('/api/v1/auth/login').flush({ code: 'invalid_credentials' }, unauthorized);

    await result.catch(() => undefined);
    http.expectNone('/api/v1/auth/refresh');
  });
});
