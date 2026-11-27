import { fakeJwt } from '../../../testing/fake-jwt';
import { readClaims } from './jwt';

describe('readClaims', () => {
  it('lê role, nome e expiração do payload', () => {
    const token = fakeJwt({ sub: 'u1', role: 'Operator', name: 'Operador Demo', exp: 1800000000 });

    expect(readClaims(token)).toEqual({
      role: 'Operator',
      name: 'Operador Demo',
      expiresAt: 1800000000 * 1000,
    });
  });

  it('lê nomes com acento', () => {
    expect(readClaims(fakeJwt({ role: 'Admin', name: 'Júlia Araújo' }))?.name).toBe('Júlia Araújo');
  });

  it('devolve null para token malformado ou role desconhecida', () => {
    expect(readClaims('nao-e-jwt')).toBeNull();
    expect(readClaims(fakeJwt({ role: 'Root' }))).toBeNull();
  });
});
