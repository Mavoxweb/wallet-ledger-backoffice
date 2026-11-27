import { formatCents, formatDateTime } from './format';

describe('formatCents', () => {
  it('formata em reais com separadores brasileiros', () => {
    expect(formatCents(123456)).toBe('R$ 1.234,56');
    expect(formatCents(0)).toBe('R$ 0,00');
  });

  it('mantém o sinal de valores negativos', () => {
    expect(formatCents(-5)).toBe('-R$ 0,05');
  });
});

describe('formatDateTime', () => {
  it('mostra o horário de Brasília', () => {
    expect(formatDateTime('2026-11-26T17:32:00Z')).toBe('26/11/2026 14:32');
  });

  it('vira o dia pelo horário de Brasília', () => {
    expect(formatDateTime('2026-11-27T02:10:00Z')).toBe('26/11/2026 23:10');
  });
});
