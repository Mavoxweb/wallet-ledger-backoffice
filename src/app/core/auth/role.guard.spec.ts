import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideApi } from '../../api';
import { fakeJwt } from '../../../testing/fake-jwt';
import { adminGuard, guestGuard, staffGuard } from './role.guard';
import { TokenStorage } from './token.storage';

@Component({ template: '' })
class Blank {}

describe('guards', () => {
  async function navigateAs(role: string | null, url: string): Promise<string> {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApi(''),
        provideRouter([
          { path: 'login', component: Blank, canActivate: [guestGuard] },
          { path: 'contas', component: Blank, canActivate: [staffGuard] },
          { path: 'admin', component: Blank, canActivate: [adminGuard] },
        ]),
      ],
    });
    if (role) {
      TestBed.inject(TokenStorage).write({
        accessToken: fakeJwt({ role, name: 'X', exp: 4102444800 }),
        refreshToken: 'rt',
      });
    }
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    return TestBed.inject(Router).url;
  }

  it('sem sessão, a rota de staff leva ao login', async () => {
    expect(await navigateAs(null, '/contas')).toBe('/login');
  });

  it('operador entra em /contas', async () => {
    expect(await navigateAs('Operator', '/contas')).toBe('/contas');
  });

  it('operador em rota de admin volta para /contas', async () => {
    expect(await navigateAs('Operator', '/admin')).toBe('/contas');
  });

  it('admin entra na rota de admin', async () => {
    expect(await navigateAs('Admin', '/admin')).toBe('/admin');
  });

  it('token de cliente não passa pela rota de staff', async () => {
    expect(await navigateAs('Customer', '/contas')).toBe('/login');
  });

  it('quem já está logado e abre /login vai para /contas', async () => {
    expect(await navigateAs('Operator', '/login')).toBe('/contas');
  });

  it('sem sessão, /login abre normalmente', async () => {
    expect(await navigateAs(null, '/login')).toBe('/login');
  });
});
