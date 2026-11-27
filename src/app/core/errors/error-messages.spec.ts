import { HttpErrorResponse } from '@angular/common/http';
import { errorMessageFor, messageForError } from './error-messages';

describe('errorMessageFor', () => {
  it.each([
    ['account_already_blocked', 409, 'já está bloqueada'],
    ['account_not_blocked', 409, 'já está ativa'],
    ['transaction_already_reversed', 409, 'já foi estornada'],
    ['reversal_not_allowed', 422, 'Um estorno não pode ser estornado.'],
    ['insufficient_funds', 422, 'não tem saldo'],
    ['not_found', 404, 'Não encontramos'],
  ])('%s tem mensagem própria', (code, status, expected) => {
    expect(errorMessageFor(code, status)).toContain(expected);
  });

  it('sem resposta do servidor fala de conexão', () => {
    expect(errorMessageFor(undefined, 0)).toContain('Não foi possível falar com o servidor.');
  });

  it('403 diz que o perfil não pode', () => {
    expect(errorMessageFor(undefined, 403)).toBe('Seu perfil não pode fazer esta ação.');
  });

  it('400 lembra a regra do motivo', () => {
    expect(errorMessageFor(undefined, 400)).toContain('10 a 500 caracteres');
  });

  it('código desconhecido cai na mensagem genérica', () => {
    expect(errorMessageFor('algo_novo', 422)).toBe(
      'Algo deu errado do nosso lado. Tente de novo em instantes.',
    );
  });

  it('lê o code do ProblemDetails de um HttpErrorResponse', () => {
    const error = new HttpErrorResponse({
      status: 422,
      error: { code: 'insufficient_funds', title: 'Saldo insuficiente.' },
    });
    expect(messageForError(error)).toContain('não tem saldo');
  });
});
