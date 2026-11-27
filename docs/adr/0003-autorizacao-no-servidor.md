# ADR 0003 — Autorização no servidor; a tela só esconde

- **Status:** aceito
- **Data:** 26/11/2026

## Contexto

O backoffice tem dois perfis: o **operador**, que consulta, bloqueia e desbloqueia, e o **admin**, que também estorna. Um cliente com conta no app também tem login válido na mesma API. A tela precisa refletir o perfil, mas qualquer pessoa pode chamar a API direto, sem passar pela tela.

## Decisão

- **A regra está na API.** `[Authorize(Roles = "Operator,Admin")]` nas rotas do backoffice e `[Authorize(Roles = "Admin")]` no estorno. Um perfil errado recebe `403`, com teste de integração na API para cada caso.
- **O backoffice só adapta a tela:**
  - o login recusa o cliente com "Este acesso é só para a equipe de operação" e revoga o refresh token que a API chegou a criar;
  - os guards (`staffGuard`, `adminGuard`) evitam abrir telas que a pessoa não pode usar;
  - o botão "Estornar" só aparece para o admin.
- **O perfil vem da claim `role` do JWT, lida sem verificar a assinatura.** Quem verifica é a API, a cada pedido. Um token adulterado mostraria um botão a mais, que a API recusaria.
- **O estado da conta não vai no token.** Bloquear vale na hora, inclusive para quem está com o app aberto: cada operação de dinheiro consulta a conta no banco.

## Consequências

- Esconder um botão nunca é tratado como segurança, e o teste ponta a ponta prova a regra do outro lado: depois do bloqueio, o Pix da cliente com a sessão antiga recebe `422 account_not_active`.
- Se o perfil de alguém mudar com a sessão aberta, a tela só se atualiza no próximo login. A API, porém, já decide com o perfil novo a partir do próximo token, que dura 15 minutos.
