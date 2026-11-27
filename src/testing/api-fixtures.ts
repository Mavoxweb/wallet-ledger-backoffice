import {
  BackofficeAccountDetail,
  BackofficeAccountSummary,
  BackofficeStatementItem,
} from '../app/api';

/** Dados de exemplo coerentes com o seed de demonstração da API. */
export function summary(
  overrides: Partial<BackofficeAccountSummary> = {},
): BackofficeAccountSummary {
  return {
    accountId: '0193f1c2-0000-7000-8000-000000003822',
    number: '3822',
    holderName: 'Ana Beatriz Lima',
    holderEmail: 'ana@walletledger.dev',
    status: 'active',
    balanceCents: 239500,
    openedAt: '2026-11-25T12:00:00Z',
    ...overrides,
  };
}

export function detail(overrides: Partial<BackofficeAccountDetail> = {}): BackofficeAccountDetail {
  return {
    accountId: '0193f1c2-0000-7000-8000-000000003822',
    number: '3822',
    holderName: 'Ana Beatriz Lima',
    holderEmail: 'ana@walletledger.dev',
    holderCpfMasked: '***.982.247-**',
    status: 'active',
    balanceCents: 239500,
    openedAt: '2026-11-25T12:00:00Z',
    pixKeys: [
      { id: 'k1', type: 'email', value: 'ana@walletledger.dev', createdAt: '2026-11-25T12:00:00Z' },
      {
        id: 'k2',
        type: 'evp',
        value: 'c9a1f6e2-4b7d-4e0a-9d3f-1b2c7a8e5f40',
        createdAt: '2026-11-26T12:00:00Z',
      },
    ],
    ...overrides,
  };
}

export function statementItem(
  overrides: Partial<BackofficeStatementItem> = {},
): BackofficeStatementItem {
  return {
    postingId: 10,
    transactionId: 'tx-10',
    type: 'transfer',
    status: 'completed',
    direction: 'in',
    amountCents: 5000,
    counterpartyMaskedName: 'Bruno C. D.',
    description: 'Almoço de sexta',
    createdAt: '2026-11-26T17:32:00Z',
    reversible: true,
    ...overrides,
  };
}
