# ADR 0002 — Cliente HTTP gerado do contrato da API

- **Status:** aceito
- **Data:** 26/11/2026

## Contexto

A [API](https://github.com/Mavoxweb/wallet-ledger-api) publica o contrato OpenAPI em cada release, gerado dos controllers (ADR 0006 da API). O app Flutter já gera o próprio cliente desse contrato. O backoffice precisa das mesmas garantias: modelos e chamadas iguais aos da API e mudanças percebidas no build, não em produção.

## Decisão

- `src/app/api` é **gerado** pelo `openapi-generator` 7.27.0 (gerador `typescript-angular`, a mesma versão usada no app), a partir do contrato fixado em `contract.version`. O script é `tool/generate-api.sh`. Se o valor é uma release, ele baixa o `openapi.json` publicado. Se ainda não há release com esse nome, baixa `contracts/openapi.json` do mesmo ref git. Hoje o pin é o commit `e57a62f284aa793b08bdd81808b19dcbf86092e3` do main da API, o merge que acrescentou `accountHolderName`. A tag `v0.2.1` ainda não existe, e este repositório não cria tag na API.
- O código gerado é **commitado** e formatado pelo Prettier do projeto, então o build não depende de Java nem de rede.
- **O CI regenera o cliente** e falha se houver diferença.
- O gerado fica fora do lint. As telas usam os tipos gerados (`BackofficeAccountDetail`, `AuditItem`…) direto: aqui não há uma camada de domínio própria para justificar uma tradução.
- **Erros pelo `code` do ProblemDetails**, nunca pelo texto do servidor: `messageForError()` mapeia o código para a mensagem da tela.

## Consequências

- Subir a versão da API é uma decisão explícita: trocar `contract.version`, rodar o script e corrigir o que o compilador apontar.
- Os nomes dos métodos gerados são longos (`apiV1BackofficeAccountsIdBlockPost`), porque a API não define `operationId`. É o preço de não escrever o cliente à mão.
- O teste ponta a ponta roda contra a API **do mesmo ref** do contrato: o CI baixa o repositório da API no valor de `contract.version` (tag ou commit).
