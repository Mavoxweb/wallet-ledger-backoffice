import { HttpErrorResponse } from '@angular/common/http';

/** O `code` estável que a API manda no ProblemDetails, quando houver. */
export function problemCode(error: unknown): string | null {
  if (!(error instanceof HttpErrorResponse)) {
    return null;
  }
  const body: unknown = error.error;
  if (body && typeof body === 'object' && 'code' in body && typeof body.code === 'string') {
    return body.code;
  }
  return null;
}

/** Sem resposta do servidor: rede caiu, API fora do ar ou bloqueada no caminho. */
export function isNetworkError(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status === 0;
}

export const NETWORK_MESSAGE =
  'Não foi possível falar com o servidor. Confira a conexão e tente de novo.';
export const UNEXPECTED_MESSAGE = 'Algo deu errado do nosso lado. Tente de novo em instantes.';
