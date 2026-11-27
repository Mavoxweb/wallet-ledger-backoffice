import { HttpErrorResponse } from '@angular/common/http';
import { NETWORK_MESSAGE, problemCode, UNEXPECTED_MESSAGE } from './problem';

/** A tela decide pelo `code` estável da API, nunca pelo texto do servidor. */
const BY_CODE: Record<string, string> = {
  account_already_blocked:
    'Esta conta já está bloqueada. Atualize a página para ver o status atual.',
  account_not_blocked: 'Esta conta já está ativa. Atualize a página para ver o status atual.',
  account_not_active: 'A conta não está ativa.',
  transaction_already_reversed:
    'Esta transação já foi estornada, talvez por outra pessoa. Atualize o extrato.',
  reversal_not_allowed: 'Um estorno não pode ser estornado.',
  insufficient_funds:
    'Quem devolve não tem saldo para o estorno. Nada foi alterado. Combine a devolução com o cliente fora do sistema ou bloqueie a conta enquanto isso.',
  not_found: 'Não encontramos este registro. Atualize a página.',
  idempotency_key_reused: 'Este pedido já foi enviado com outros dados. Feche e tente de novo.',
};

export function errorMessageFor(code: string | undefined | null, status: number): string {
  if (code && BY_CODE[code]) {
    return BY_CODE[code];
  }
  if (status === 0) {
    return NETWORK_MESSAGE;
  }
  if (status === 403) {
    return 'Seu perfil não pode fazer esta ação.';
  }
  if (status === 400) {
    return 'Confira os dados: o motivo precisa ter de 10 a 500 caracteres.';
  }
  return UNEXPECTED_MESSAGE;
}

export function messageForError(error: unknown): string {
  const status = error instanceof HttpErrorResponse ? error.status : -1;
  return errorMessageFor(problemCode(error), status);
}
