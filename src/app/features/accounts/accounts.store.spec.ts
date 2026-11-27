import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideApi } from '../../api';
import { summary } from '../../../testing/api-fixtures';
import { fakeJwt } from '../../../testing/fake-jwt';
import { SessionStore } from '../../core/auth/session.store';
import { AccountsStore } from './accounts.store';

const URL = '/api/v1/backoffice/accounts';

describe('AccountsStore', () => {
  let http: HttpTestingController;
  let store: AccountsStore;

  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.setItem(
      'wl.session',
      JSON.stringify({
        accessToken: fakeJwt({ role: 'Operator', name: 'Operador Demo', exp: 4102444800 }),
        refreshToken: 'rt',
      }),
    );
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideApi('')],
    });
    http = TestBed.inject(HttpTestingController);
    store = TestBed.inject(AccountsStore);
    TestBed.tick();
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it('digitação rápida vira uma requisição só, 300 ms depois da última tecla', () => {
    store.search('a');
    store.search('an');
    store.search('ana ');
    vi.advanceTimersByTime(299);
    http.expectNone((r) => r.url === URL);

    vi.advanceTimersByTime(1);

    const req = http.expectOne((r) => r.url === URL);
    expect(req.request.params.get('q')).toBe('ana');
    req.flush({ items: [summary()], nextCursor: null });
    expect(store.items()).toHaveLength(1);
    expect(store.loading()).toBe(false);
  });

  it('busca vazia não manda q', () => {
    store.load();

    const req = http.expectOne((r) => r.url === URL);
    expect(req.request.params.has('q')).toBe(false);
    req.flush({ items: [], nextCursor: null });
  });

  it('filtro de status busca na hora e cancela a busca digitada pendente', () => {
    store.search('ana');
    store.setStatus('blocked');

    const req = http.expectOne((r) => r.url === URL);
    expect(req.request.params.get('status')).toBe('blocked');
    expect(req.request.params.get('q')).toBe('ana');
    req.flush({ items: [], nextCursor: null });

    vi.advanceTimersByTime(500);
    http.expectNone((r) => r.url === URL);
  });

  it('"Carregar mais" concatena sem repetir ids', () => {
    store.load();
    http
      .expectOne((r) => r.url === URL)
      .flush({
        items: [summary({ accountId: 'a' }), summary({ accountId: 'b' })],
        nextCursor: 'c1',
      });

    store.loadMore();
    const more = http.expectOne((r) => r.url === URL);
    expect(more.request.params.get('cursor')).toBe('c1');
    more.flush({
      items: [summary({ accountId: 'b' }), summary({ accountId: 'c' })],
      nextCursor: null,
    });

    expect(store.items().map((i) => i.accountId)).toEqual(['a', 'b', 'c']);
    expect(store.nextCursor()).toBeNull();
  });

  it('erro de rede vira mensagem e a lista anterior continua', () => {
    store.load();
    http.expectOne((r) => r.url === URL).flush({ items: [summary()], nextCursor: 'c1' });

    store.loadMore();
    http.expectOne((r) => r.url === URL).error(new ProgressEvent('error'));

    expect(store.items()).toHaveLength(1);
    expect(store.error()).toContain('Não foi possível falar com o servidor.');
  });

  it('sync atualiza status e saldo de uma conta já listada (volta do detalhe)', () => {
    store.load();
    http
      .expectOne((r) => r.url === URL)
      .flush({
        items: [summary({ accountId: 'a' }), summary({ accountId: 'b' })],
        nextCursor: null,
      });

    store.sync({ accountId: 'a', status: 'blocked', balanceCents: 100 });

    expect(store.items()[0]).toMatchObject({
      accountId: 'a',
      status: 'blocked',
      balanceCents: 100,
    });
    expect(store.items()[1].status).toBe('active');
  });

  it('sync de conta fora da lista não muda nada', () => {
    store.load();
    http
      .expectOne((r) => r.url === URL)
      .flush({ items: [summary({ accountId: 'a' })], nextCursor: null });
    const before = store.items();

    store.sync({ accountId: 'zzz', status: 'blocked', balanceCents: 1 });

    expect(store.items()).toBe(before);
  });

  it('ao sair da sessão, a lista e a busca são esquecidas', () => {
    store.search('ana');
    vi.advanceTimersByTime(300);
    http.expectOne((r) => r.url === URL).flush({ items: [summary()], nextCursor: 'c1' });

    TestBed.inject(SessionStore).clear();
    TestBed.tick();

    expect(store.items()).toEqual([]);
    expect(store.query()).toBe('');
    expect(store.nextCursor()).toBeNull();
    expect(store.loaded()).toBe(false);
  });
});
