import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideApi } from '../../api';
import { summary } from '../../../testing/api-fixtures';
import { AccountsStore } from './accounts.store';

const URL = '/api/v1/backoffice/accounts';

describe('AccountsStore', () => {
  let http: HttpTestingController;
  let store: AccountsStore;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideApi('')],
    });
    http = TestBed.inject(HttpTestingController);
    store = TestBed.inject(AccountsStore);
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
});
