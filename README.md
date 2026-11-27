# Wallet Ledger Backoffice

[![CI](https://github.com/Mavoxweb/wallet-ledger-backoffice/actions/workflows/ci.yml/badge.svg)](https://github.com/Mavoxweb/wallet-ledger-backoffice/actions/workflows/ci.yml)
![Angular 22](https://img.shields.io/badge/Angular-22-DD0031?logo=angular&logoColor=white)

O painel da equipe de operação do Wallet Ledger: buscar a conta de um cliente, ver o extrato, bloquear uma conta suspeita, estornar um Pix enviado por engano e consultar quem fez o quê.

> **Faz parte do Wallet Ledger**
> - [wallet-ledger-api](https://github.com/Mavoxweb/wallet-ledger-api): API .NET com razão de partidas dobradas, idempotência e auditoria
> - [wallet-ledger-mobile](https://github.com/Mavoxweb/wallet-ledger-mobile): app do correntista em Flutter (Pix, extrato, QR code)
> - **wallet-ledger-backoffice**: este painel, em Angular *(em construção)*

## O que já funciona

- **Login só para a equipe.** Operador e admin entram; um cliente que tente entrar é recusado com uma mensagem clara, e a sessão que a API chegou a abrir para ele é revogada na hora.
- **Sessão que aguenta conexão ruim.** O access token é renovado sozinho. Três pedidos que recebem `401` ao mesmo tempo disparam **uma** renovação só (a API gira o refresh token, e usar o antigo duas vezes derrubaria a sessão). Se a renovação falha por rede ou erro do servidor, a sessão continua; só uma recusa da API (`4xx`) leva de volta ao login.
- **Rotas por perfil.** Os guards escondem o que a pessoa não pode usar. A segurança de verdade é da API, que responde `403` para qualquer perfil errado, mesmo chamada direto.

## Stack

- **Angular 22** com componentes standalone, signals e o controle de fluxo novo (`@if`, `@for`)
- **Angular Material 3** com tema próprio (tinta `#0F1413`, menta `#7FD3BF`, Inter e Space Grotesk)
- **Cliente da API gerado** do contrato OpenAPI publicado em cada release da API (`openapi-generator`, `typescript-angular`)
- **Vitest** nos testes unitários e de componente

## Como rodar

Pré-requisitos: **Node 24.15+** (ou 26) e a [API](https://github.com/Mavoxweb/wallet-ledger-api) rodando em `localhost:8080` (`docker compose up --build` no repositório dela).

```bash
npm install
npm start
```

Abra http://localhost:4200 e entre com `operador@walletledger.dev` ou `admin@walletledger.dev`, senha `Demo@1234`.

Em desenvolvimento, o `ng serve` repassa `/api` para `localhost:8080` (`proxy.conf.json`): o navegador fala com uma origem só, e a API não precisa liberar CORS para o painel.

## Contrato da API

O cliente em `src/app/api` é gerado, nunca editado à mão. A versão do contrato fica em [`contract.version`](contract.version); para atualizar:

```bash
echo v0.2.0 > contract.version
npm run generate-api   # precisa de Java 17+ e do gh autenticado
```

O CI regenera o cliente e falha se o código commitado for diferente.

## Testes

```bash
npm test
```
