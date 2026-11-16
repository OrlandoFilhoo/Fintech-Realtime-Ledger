require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configuração do Pool de Conexões PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/fintech_ledger'
});

// Endpoint de Healthcheck
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', service: 'FinTech Real-Time Ledger Engine', timestamp: new Date() });
});

// Listar Contas e Saldos em Tempo Real
app.get('/api/accounts', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM accounts ORDER BY created_at ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar contas', details: err.message });
  }
});

// Histórico do Livro-Razão (Audit Trail)
app.get('/api/ledger/:accountId', async (req, res) => {
  try {
    const { accountId } = req.params;
    const result = await pool.query(
      `SELECT le.*, t.description, t.idempotency_key 
       FROM ledger_entries le
       JOIN transactions t ON le.transaction_id = t.id
       WHERE le.account_id = $1
       ORDER BY le.created_at DESC LIMIT 50`,
      [accountId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao consultar livro-razão', details: err.message });
  }
});

// Transferência Financeira Atômica (ACID + Row-Level Locking + Idempotência)
app.post('/api/transfers', async (req, res) => {
  const { idempotencyKey, sourceAccountId, destinationAccountId, amount, description } = req.body;

  if (!idempotencyKey || !sourceAccountId || !destinationAccountId || !amount || amount <= 0) {
    return res.status(400).json({ error: 'Parâmetros inválidos para transferência.' });
  }

  if (sourceAccountId === destinationAccountId) {
    return res.status(400).json({ error: 'Conta de origem e destino não podem ser iguais.' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Verificação de Idempotência (Evita duplicidade em retries de rede)
    const existingTx = await client.query(
      'SELECT * FROM transactions WHERE idempotency_key = $1',
      [idempotencyKey]
    );

    if (existingTx.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(200).json({
        message: 'Transação já processada (Idempotency Hit)',
        transaction: existingTx.rows[0]
      });
    }

    // 2. Bloqueio Pessimista (FOR UPDATE) ordenado por UUID para evitar Deadlocks
    const [firstLockId, secondLockId] = [sourceAccountId, destinationAccountId].sort();
    await client.query('SELECT id FROM accounts WHERE id IN ($1, $2) FOR UPDATE', [firstLockId, secondLockId]);

    // 3. Validar saldo da conta de origem
    const sourceRes = await client.query('SELECT * FROM accounts WHERE id = $1', [sourceAccountId]);
    const destRes = await client.query('SELECT * FROM accounts WHERE id = $1', [destinationAccountId]);

    if (sourceRes.rows.length === 0 || destRes.rows.length === 0) {
      throw new Error('Conta de origem ou destino não encontrada.');
    }

    const sourceAccount = sourceRes.rows[0];
    const destAccount = destRes.rows[0];
    const transferAmount = parseFloat(amount);

    if (parseFloat(sourceAccount.balance) < transferAmount) {
      throw new Error('Saldo insuficiente na conta de origem.');
    }

    // 4. Atualizar saldos
    const newSourceBalance = parseFloat(sourceAccount.balance) - transferAmount;
    const newDestBalance = parseFloat(destAccount.balance) + transferAmount;

    await client.query('UPDATE accounts SET balance = $1, updated_at = NOW() WHERE id = $2', [newSourceBalance, sourceAccountId]);
    await client.query('UPDATE accounts SET balance = $1, updated_at = NOW() WHERE id = $2', [newDestBalance, destinationAccountId]);

    // 5. Registrar Transação Principal
    const txId = uuidv4();
    const txInsert = await client.query(
      `INSERT INTO transactions (id, idempotency_key, source_account_id, destination_account_id, amount, status, description)
       VALUES ($1, $2, $3, $4, $5, 'COMPLETED', $6) RETURNING *`,
      [txId, idempotencyKey, sourceAccountId, destinationAccountId, transferAmount, description || 'Transferência P2P']
    );

    // 6. Registrar Partidas Dobradas (Débito e Crédito no Ledger)
    await client.query(
      `INSERT INTO ledger_entries (transaction_id, account_id, entry_type, amount, balance_after)
       VALUES ($1, $2, 'DEBIT', $3, $4)`,
      [txId, sourceAccountId, transferAmount, newSourceBalance]
    );

    await client.query(
      `INSERT INTO ledger_entries (transaction_id, account_id, entry_type, amount, balance_after)
       VALUES ($1, $2, 'CREDIT', $3, $4)`,
      [txId, destinationAccountId, transferAmount, newDestBalance]
    );

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Transferência concluída com sucesso',
      transaction: txInsert.rows[0],
      updatedBalances: {
        source: newSourceBalance,
        destination: newDestBalance
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 FinTech Real-Time Ledger rodando na porta ${PORT}`);
});