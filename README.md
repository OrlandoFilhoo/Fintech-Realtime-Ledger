# FinTech Real-Time Ledger Engine

Motor financeiro de liquidação em tempo real baseado em **Partidas Dobradas (Double-Entry Bookkeeping)**, construído com Node.js, PostgreSQL e React. Projetado para garantir consistência estrita (ACID), prevenção contra condições de corrida (*race conditions*) e idempotência em operações financeiras de alta concorrência.

## Arquitetura & Garantias Técnicas

* **Double-Entry Bookkeeping (Partidas Dobradas):** Toda movimentação gera simultaneamente um registro imutável de `DEBIT` na conta de origem e `CREDIT` na conta de destino, assegurando que a soma líquida do sistema seja sempre zero.
* **Idempotência de Requisições:** Uso de `idempotency_key` única por transação para evitar cobranças ou transferências duplicadas em casos de falhas de rede ou retentativas automáticas (*retries*).
* **Controle de Concorrência & Prevenção de Deadlocks:** Utilização de bloqueio pessimista a nível de linha (`SELECT ... FOR UPDATE`) com ordenação determinística de chaves UUID antes da mutação dos saldos.
* **Trilha de Auditoria Imutável:** Histórico completo na tabela `ledger_entries` registrando o saldo resultante (`balance_after`) após cada operação.

## Estrutura do Repositório

* `schema.sql` — Modelagem relacional PostgreSQL com constraints de integridade e índices de performance.
* `server.js` — API REST em Express/Node.js gerenciando o ciclo transacional (`BEGIN`, `COMMIT`, `ROLLBACK`).
* `App.jsx` — Interface operacional em React para simulação de liquidações e monitoramento do livro-razão.
* `package.json` — Manifesto de dependências do servidor backend.

## Como Executar Localmente

1. **Configurar o Banco de Dados:**
   Crie um banco PostgreSQL chamado `fintech_ledger` e execute o script de estrutura:
   ```bash
   psql -U postgres -d fintech_ledger -f schema.sql