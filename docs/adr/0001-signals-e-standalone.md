# ADR 0001 — Componentes standalone e estado em signals

- **Status:** aceito
- **Data:** 26/11/2026

## Contexto

O backoffice é uma ferramenta interna com poucas telas: lista de contas, detalhe, auditoria. O estado de cada tela é pequeno, mas muda o tempo todo: a busca digitada, a página carregada, a aba aberta e o resultado de uma ação. O Angular atual oferece componentes standalone, signals e o controle de fluxo `@if` e `@for`, e o projeto começa do zero, sem código legado para manter.

## Decisão

- **Standalone em tudo**, sem `NgModule`: cada componente declara os próprios `imports`, e o app sobe com `bootstrapApplication` e funções `provide*()`.
- **Estado em signals:** `signal` para o valor, `computed` para o que é derivado (a aba vem do `?aba=` da URL) e `effect` só para efeitos colaterais (carregar o extrato quando a conta muda).
- **RxJS onde ele brilha:** fluxos no tempo, como a busca com espera de 300 ms e cancelamento (`switchMap` com `timer`), a renovação única do token (`shareReplay`) e as rotas (`toSignal`). O resultado volta para signals.
- **`OnPush` em todos os componentes**, já que os signals avisam o Angular sobre o que mudou.
- **Sem biblioteca de estado (NgRx).** Os stores são serviços pequenos com signals (`SessionStore`, `AccountsStore`) ou classes simples (`AuditFeed`).

## Alternativas consideradas

- **NgRx Store:** bom para estado compartilhado complexo entre muitas telas e equipes. Aqui seria mais código (ações, reducers, effects) para pouco estado.
- **`BehaviorSubject` em serviços:** funciona, mas exige `async` pipe e cuidado com inscrições. Os signals dão a mesma reatividade com leitura síncrona e sem vazamento.

## Consequências

- O template lê o estado como função (`store.items()`), e o que não mudou não é verificado de novo.
- Quem conhece o Angular de antes de 2023 precisa se acostumar com `input()`, `output()`, `model()`, `viewChild()` e `@if`.
- Testes de componente usam `fixture.whenStable()`. O trabalho assíncrono iniciado pela tela (login, ações dos diálogos) roda dentro de `PendingTasks.run` para que o Angular saiba que ainda há trabalho pendente.
